from flask import Flask, request, jsonify
import math
import random

app = Flask(__name__)

# CONFIG
WEIGHTS = {
    "LIKE": 1.0,
    "REPOST": 2.0,
    "COMMENT": 3.0,
    "SOCIAL_SIGNAL": 50.0, # Naikkan bobot Teman Like biar sering muncul
    "FOLLOWING": 30.0,     # Naikkan bobot Following
    "INTEREST": 15.0,
    "VERIFIED": 1.2
}

def calculate_score(post):
    # 1. Base Metrics
    viral_score = (post.get('likes', 0) * WEIGHTS['LIKE']) + \
                  (post.get('reposts', 0) * WEIGHTS['REPOST']) + \
                  (post.get('comments', 0) * WEIGHTS['COMMENT'])

    # 2. Context Bonus
    context_score = 0
    if post.get('has_friend_liked'): context_score += WEIGHTS['SOCIAL_SIGNAL']
    if post.get('is_following'): context_score += WEIGHTS['FOLLOWING']
    if post.get('is_interest'): context_score += WEIGHTS['INTEREST']
    
    # 3. Verified Multiplier
    multiplier = WEIGHTS['VERIFIED'] if post.get('is_verified') else 1.0

    raw_score = (viral_score + context_score + 5) * multiplier

    # 4. TIME DECAY (Gravity)
    # Postingan following/teman kita kasih toleransi waktu lebih lama (pow 1.5)
    # Postingan viral asing cepat basi (pow 1.8)
    hours_ago = max(0.1, post.get('hours_ago', 0))
    
    exponent = 1.5 if (post.get('is_following') or post.get('has_friend_liked')) else 1.8
    gravity = math.pow(hours_ago + 2, exponent)
    
    final_score = raw_score / gravity

    # 5. JITTER (Tie-Breaker, bukan chaos)
    # Range 0.92 s/d 1.08 (Variasi +/- 8%) -> Cukup untuk variasi, tidak mengganggu ranking
    jitter = random.uniform(0.92, 1.08) 
    
    # 6. LABEL DETERMINATION (Hierarchy)
    # Urutan if ini menentukan label mana yang menang jika post memenuhi 2 kriteria
    rec_type = "viral"
    
    if post.get('has_friend_liked'): 
        rec_type = "social_like" # Paling Prioritas: "Budi liked this"
    elif post.get('is_following'): 
        rec_type = "following"   # Kedua: "From following" (Frontend bisa hide label ini kalau mau native feel)
    elif post.get('is_interest'): 
        rec_type = "interest"    # Ketiga: "Sesuai Minat"

    return {
        "id": post['id'],
        "score": final_score * jitter,
        "rec_type": rec_type
    }

@app.route('/rank', methods=['POST'])
def rank_feed():
    try:
        data = request.json
        candidates = data.get('candidates', [])
        
        ranked_results = [calculate_score(p) for p in candidates]
        ranked_results.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify(ranked_results)
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)