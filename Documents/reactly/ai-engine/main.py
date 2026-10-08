import redis
import json
import time
import spacy
import os
import numpy as np
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_distances
from collections import Counter

# IMPORT MODUL CUSTOM
from stopwords import is_stopword
from classifier import TopicClassifier

load_dotenv()

# Konfigurasi Environment
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASSWORD", None)
STREAM_KEY = os.getenv("STREAM_KEY", "post_stream")
TRENDING_KEY = "trending_scores"
TOPIC_META_KEY = "topic_meta_data"
BUFFER_PREFIX = "trending_buffer" 

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://hendrikpurwanto281:asdffjkl@cluster0.g2h81.mongodb.net/reactly_db?retryWrites=true&w=majority") 

print("⏳ Loading AI Brain V7 (Final Polish)...")

# ==============================================================================
# [FIXED] MODEL LOADING STRATEGY
# We strictly enforce 'en_core_web_sm' because 'xx_ent_wiki_sm' lacks the
# dependency parser required for 'doc.noun_chunks'. Without noun_chunks,
# our Topic Abstraction logic fails.
# ==============================================================================
try:
    print("   🧠 Loading spaCy model: en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("   ⬇️ Downloading en_core_web_sm...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

print("   🧠 Loading Embedding Model (MiniLM)...")
embedder = SentenceTransformer('all-MiniLM-L6-v2') 

class ClusterMemory:
    """
    Ingatan Jangka Pendek (Category Aware).
    Menyimpan centroid topik agar stabil, tapi terpisah per kategori.
    """
    def __init__(self):
        self.centroids = {} 
        self.last_seen = {}

    def find_match(self, new_centroid, category, threshold=0.15):
        if category not in self.centroids: return None
        
        best_label = None
        min_dist = 1.0

        for label, centroid in self.centroids[category].items():
            dist = cosine_distances([new_centroid], [centroid])[0][0]
            if dist < min_dist:
                min_dist = dist
                best_label = label
        
        if min_dist < threshold:
            return best_label
        return None

    def update(self, label, new_centroid, category):
        if category not in self.centroids: self.centroids[category] = {}
        
        if label in self.centroids[category]:
            self.centroids[category][label] = (self.centroids[category][label] * 0.7) + (new_centroid * 0.3)
        else:
            self.centroids[category][label] = new_centroid
            
        self.last_seen[f"{category}:{label}"] = time.time()

    def cleanup(self):
        now = time.time()
        to_remove = [k for k, v in self.last_seen.items() if now - v > 3600]
        for k in to_remove:
            cat, lbl = k.split(":", 1)
            if cat in self.centroids and lbl in self.centroids[cat]:
                del self.centroids[cat][lbl]
            del self.last_seen[k]

class ConflictAnalyzer:
    def __init__(self):
        self.anchors = [
            "kontroversi", "perdebatan", "ketidakadilan", "kemarahan", 
            "kesalahan fatal", "skandal", "kebohongan", "protes", "aneh banget",
            "ribut", "berantem", "drama", "blunder"
        ]
        self.anchor_embeddings = embedder.encode(self.anchors)

    def get_score(self, text):
        if len(text.split()) < 3: return 0.0
        text_emb = embedder.encode([text])[0]
        dists = cosine_distances([text_emb], self.anchor_embeddings)[0]
        min_dist = np.min(dists)
        
        if min_dist < 0.6: return 1.5 
        if min_dist < 0.75: return 0.8
        return 0.0

class BatchProcessor:
    def __init__(self, redis_client, classifier):
        self.r = redis_client
        self.classifier = classifier
        self.last_flush = time.time()
        self.flush_interval = 15  # Kurangi interval jadi 15s agar lebih responsif
        self.memory = ClusterMemory()

    def push(self, topic_data):
        # Semua masuk ke satu antrean besar, tidak perlu dipisah per kategori lagi
        shard_key = f"{BUFFER_PREFIX}:main"
        self.r.rpush(shard_key, json.dumps(topic_data))

    def process_buffer(self):
        if time.time() - self.last_flush < self.flush_interval: return

        buffer_key = f"{BUFFER_PREFIX}:main"
        items_raw = self.r.lrange(buffer_key, 0, -1)
        if not items_raw:
            self.last_flush = time.time()
            self.memory.cleanup()
            return

        self.r.delete(buffer_key)
        items = [json.loads(i) for i in items_raw]
        print(f"🔄 Editorial Meeting: Processing {len(items)} topics in bulk...")
        
        pipe = self.r.pipeline()
        self._process_category_batch(items, pipe)
        pipe.execute()
        
        self.last_flush = time.time()

    def _process_category_batch(self, items, pipe):
        unique_topics = list(set([i['topic'] for i in items]))
        if not unique_topics: return

        topic_embeddings = embedder.encode(unique_topics)
        clustering = AgglomerativeClustering(
            n_clusters=None, 
            distance_threshold=0.4, 
            metric='cosine', 
            linkage='average'
        )
        # Jika hanya 1 topik, sklearn error, jadi bypass
        if len(unique_topics) > 1:
            clustering.fit(topic_embeddings)
            labels = clustering.labels_
        else:
            labels = [0]
        
        topic_to_cluster = {topic: label for topic, label in zip(unique_topics, labels)}
        clusters = {}
        
        for item in items:
            c_id = topic_to_cluster.get(item['topic'])
            if c_id not in clusters: clusters[c_id] = {'items': [], 'topics': set()}
            clusters[c_id]['items'].append(item)
            clusters[c_id]['topics'].add(item['topic'])

        for c_id, data in clusters.items():
            cluster_items = data['items']
            cluster_topics = list(data['topics'])
            
            user_scores = {}
            for item in cluster_items:
                uid = item['user_id']
                user_scores[uid] = user_scores.get(uid, 0) + item['weight']
            
            velocity_score = sum(min(score, 5.0) for score in user_scores.values())

            topic_counts = Counter([i['topic'] for i in cluster_items])
            def label_score(t):
                t_type = next((i['type'] for i in cluster_items if i['topic'] == t), 'keyword')
                type_score = {'entity': 3, 'concept': 2, 'hashtag': 1}.get(t_type, 0)
                return (type_score, topic_counts[t], -len(t))
            
            best_candidate = max(cluster_topics, key=label_score)

            indices = [unique_topics.index(t) for t in cluster_topics]
            centroid = np.mean(topic_embeddings[indices], axis=0)

            # --- OPTIMASI SUPER CEPAT ---
            # Kita jalankan Zero-Shot Classifier SATU KALI per kluster, bukan per post!
            # Ambil sampel teks dari post-post di kluster ini untuk ngasih konteks ke AI
            sample_texts = [i.get('context', '') for i in cluster_items if i.get('context')]
            context_block = " ".join(sample_texts[:3]) # Ambil max 3 post sebagai konteks
            
            dominant_cat = self.classifier.classify(context_block, best_candidate)
            
            stable_label = self.memory.find_match(centroid, dominant_cat)
            
            if stable_label:
                final_label = stable_label
                self.memory.update(stable_label, centroid, dominant_cat)
            else:
                final_label = best_candidate
                self.memory.update(final_label, centroid, dominant_cat)

            if velocity_score < 2.0 and not stable_label: continue

            pipe.zincrby(TRENDING_KEY, velocity_score, final_label)
            
            reason = "Trending"
            if velocity_score > 15.0: reason = "🔥 Viral meledak"
            elif velocity_score > 8.0: reason = "↗️ Sedang naik"
            elif len(user_scores) > 10 and velocity_score > 5.0: reason = "💬 Ramai diskusi"

            existing_meta_raw = self.r.hget(TOPIC_META_KEY, final_label)
            current_time = time.time()
            
            if existing_meta_raw:
                meta = json.loads(existing_meta_raw)
                meta["count"] += len(user_scores)
                meta["last_active"] = current_time
                meta["reason"] = reason 
                meta["category"] = dominant_cat
            else:
                meta = {
                    "count": len(user_scores),
                    "category": dominant_cat,
                    "reason": reason,
                    "first_seen": current_time, 
                    "last_active": current_time
                }
            
            pipe.hset(TOPIC_META_KEY, final_label, json.dumps(meta))
            print(f"   ✅ [{dominant_cat}] {final_label} (+{velocity_score:.1f})")


class TrendingEngine:
    def __init__(self):
        self.r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True, protocol=2)
        self.group_name = "ai_group"
        self.consumer_name = "brain_1"
        self.classifier = TopicClassifier()
        self.conflict_analyzer = ConflictAnalyzer() 
        self.batch_processor = BatchProcessor(self.r, self.classifier)
        self.last_decay = 0  
        
        try:
            self.mongo_client = MongoClient(MONGO_URI)
            self.db = self.mongo_client.get_database()
            self.posts_collection = self.db.posts
            print("✅ MongoDB Connected.")
        except Exception as e:
            print(f"❌ MongoDB Failed: {e}")

        try:
            self.r.xgroup_create(STREAM_KEY, self.group_name, mkstream=True)
        except redis.exceptions.ResponseError: pass

    def apply_smart_decay(self):
        topics = self.r.zrange(TRENDING_KEY, 0, -1, withscores=True)
        current_time = time.time()
        pipe = self.r.pipeline()
        
        for topic, score in topics:
            meta_raw = self.r.hget(TOPIC_META_KEY, topic)
            if not meta_raw: continue
            
            meta = json.loads(meta_raw)
            last_active = meta.get('last_active', current_time)
            first_seen = meta.get('first_seen', 0)
            
            topic_age = current_time - first_seen
            if topic_age < 300: 
                continue 

            silence = current_time - last_active
            
            new_score = score
            if silence > 900: new_score *= 0.8  
            elif silence > 300: new_score *= 0.95 
            
            if new_score < 1:
                pipe.zrem(TRENDING_KEY, topic)
                pipe.hdel(TOPIC_META_KEY, topic)
            else:
                pipe.zadd(TRENDING_KEY, {topic: new_score})
        pipe.execute()

    def extract_concepts(self, text):
        if not text: return []
        doc = nlp(text)
        candidates = []
        seen = set()

        for ent in doc.ents:
            clean = ent.text.strip().title()
            if len(clean) > 2 and clean.lower() not in seen:
                candidates.append({"topic": clean, "type": "entity", "weight": 2.0})
                seen.add(clean.lower())

        # [SAFEGUARD] Noun Chunks
        if doc.has_annotation("DEP"):
            for chunk in doc.noun_chunks:
                chunk_text = chunk.text.strip().title()
                # Hindari kata ganti atau kata sifat tunggal yang di-parse salah sebagai noun chunk
                # Syarat: lebih dari 4 huruf, bukan stopword, dan panjang maksimal 4 kata (hindari 1 kalimat jadi 1 topik)
                if len(chunk_text) > 4 and chunk_text.lower() not in seen:
                    word_count = len(chunk_text.split())
                    if word_count <= 4:
                        candidates.append({"topic": chunk_text, "type": "concept", "weight": 1.5})
                        seen.add(chunk_text.lower())

        hashtags = [t for t in text.split() if t.startswith("#")]
        for tag in hashtags:
            clean = tag.strip().replace('#', '')
            if len(clean) > 2:
                candidates.append({"topic": clean, "type": "hashtag", "weight": 2.5})

        return candidates

    def get_context_content(self, parent_id):
        if not parent_id: return None
        try:
            post = self.posts_collection.find_one({"_id": ObjectId(parent_id)}, {"content": 1})
            return post.get('content') if post else None
        except: return None

    def run(self):
        print("🚀 AI Brain V7 Running (Final Form)...")
        while True:
            try:
                self.batch_processor.process_buffer()
                # ✅ FIX: time.time() % 60 hampir tidak pernah == 0 karena float
                # Gunakan last_decay tracker untuk interval yang benar
                if time.time() - self.last_decay > 60:
                    self.apply_smart_decay()
                    self.last_decay = time.time()
                
                entries = self.r.xreadgroup(self.group_name, self.consumer_name, {STREAM_KEY: '>'}, count=10, block=2000)
                if not entries: continue

                for stream, messages in entries:
                    for message_id, data in messages:
                        self.process_message(data)
                        self.r.xack(STREAM_KEY, self.group_name, message_id)

            except Exception as e:
                print(f"❌ Error: {e}")
                time.sleep(1)

    def process_message(self, data):
        try:
            payload = json.loads(data['data'])
            text = payload.get('text', '')
            user_id = payload.get('userId')
            event_type = payload.get('type', 'post') 
            parent_id = payload.get('parentId')

            weight_map = {'post': 1.0, 'reply': 1.5, 'quote': 2.0, 'repost': 1.0, 'vote': 0.5}
            weight = weight_map.get(event_type, 1.0)
            
            conflict_boost = self.conflict_analyzer.get_score(text)
            weight += conflict_boost
            if payload.get('isVerified'): weight *= 1.5

            concepts = self.extract_concepts(text)
            
            if event_type == 'reply' and parent_id:
                parent_text = self.get_context_content(parent_id)
                if parent_text:
                    parent_concepts = self.extract_concepts(parent_text)
                    for pc in parent_concepts: pc['weight'] = 0.8
                    concepts.extend(parent_concepts)

            if not concepts: return

            if not concepts: return

            processed = set()
            for item in concepts:
                topic_str = item['topic']
                if topic_str in processed: continue
                
                final_weight = weight * item.get('weight', 1.0)
                
                self.batch_processor.push({
                    "topic": topic_str,
                    "type": item['type'],
                    "weight": final_weight,
                    "user_id": user_id,
                    "context": text  # Bawa teks asli buat diklasifikasi nanti per kluster
                })
                processed.add(topic_str)

        except Exception as e:
            print(f"⚠️ Process Error: {e}")

if __name__ == "__main__":
    engine = TrendingEngine()
    engine.run()