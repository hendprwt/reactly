import torch
from transformers import pipeline

class TopicClassifier:
    def __init__(self):
        print("🧠 Loading Zero-Shot Classification Model... (This may take a while first time)")
        
        # Cek apakah ada GPU (CUDA) atau pakai CPU
        device = 0 if torch.cuda.is_available() else -1
        
        # Kita pakai pipeline "zero-shot-classification".
        # Model diganti ke 'MoritzLaurer/mDeBERTa-v3-base-mnli-xnli' 
        # karena model ini MULTILINGUAL dan mendukung Bahasa Indonesia dengan sangat akurat.
        try:
            self.classifier = pipeline(
                "zero-shot-classification", 
                model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli", 
                device=device
            )
            print(f"✅ AI Model Loaded on {'GPU' if device == 0 else 'CPU'}")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            self.classifier = None

        # DAFTAR KATEGORI (Label)
        # AI akan memilih mana dari label ini yang paling cocok dengan teks post.
        # Kamu bisa tambah/hapus sesuka hati TANPA perlu training ulang/tambah keyword.
        self.candidate_labels = [
            "Olahraga", 
            "Politik & Pemerintahan", 
            "Hiburan & Selebritis", 
            "Teknologi & Gadget", 
            "Bencana Alam", 
            "Keuangan & Bisnis",
            "Kesehatan",
            "Game & Anime",
            "Curhat & Kehidupan"
        ]

    def classify(self, text, extracted_topic=None):
        """
        Menebak kategori berdasarkan konteks kalimat (Semantic Understanding).
        """
        if not self.classifier:
            return "General"

        # Gabungkan text dengan topic hasil regex/spacy agar konteks lebih kuat
        # Contoh: Topic="Timnas", Text="Menang telak" -> "Timnas Menang telak"
        full_text = f"{extracted_topic} {text}" if extracted_topic else text
        
        # Pastikan text tidak terlalu panjang (Truncate biar gak error model)
        full_text = full_text[:512] 

        try:
            # Lakukan Prediksi
            result = self.classifier(full_text, self.candidate_labels, multi_label=False)
            
            # Result format:
            # {'labels': ['Olahraga', 'Hiburan'...], 'scores': [0.98, 0.01...]}
            
            top_label = result['labels'][0]
            confidence = result['scores'][0]

            # Debugging: Liat seberapa yakin si AI
            # print(f" 🤖 AI thinks: '{top_label}' ({confidence:.2f}) for: {full_text[:30]}...")

            # Threshold: Kalau AI ragu-ragu (skor < 0.3), anggap General aja
            if confidence > 0.15:
                return top_label
            else:
                return "General"

        except Exception as e:
            print(f"⚠️ Classification Error: {e}")
            return "General"

# Test sebentar kalau file ini dijalankan langsung
if __name__ == "__main__":
    ai = TopicClassifier()
    print(ai.classify("Siap-siap war tiket konser besok!")) # Harusnya: Hiburan
    print(ai.classify("Indo pride! timnas mainnya ngeri"))  # Harusnya: Olahraga
    print(ai.classify("Gempa kerasa banget di bandung"))    # Harusnya: Bencana