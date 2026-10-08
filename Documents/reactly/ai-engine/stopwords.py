import spacy

# Load basic stopwords from Spacy (Indonesian)
try:
    # Coba load model bahasa indonesia jika ada
    nlp_id = spacy.blank("id")
    BASE_STOPWORDS = nlp_id.Defaults.stop_words
except:
    BASE_STOPWORDS = set()

# Tambahan Slang / Noise Words (Bahasa Sosmed)
CUSTOM_STOPWORDS = {
    "waduh", "anjir", "wow", "banget", "barusan", "tadi", "lagi", "udah", "gak", 
    "bisa", "kalo", "sih", "nya", "yg", "kenceng", "woy", "gila", "parah", "berita",
    "info", "update", "terkini", "viral", "video", "foto", "sumber", "via", "baca",
    "doang", "dong", "deh", "kok", "mah", "tuh", "nih", "kan", "gan", "sis", "bro",
    "guys", "ygy", "bestie", "cuy", "anjrit", "anjay", "wkwk", "wkwkwk", "haha",
    "hehe", "hiks", "huhu", "ya", "yah", "iya", "yoi", "kapan", "dimana", "siapa",
    "jujurly", "valid", "no", "debat", "fix", "please", "pls", "tolong"
}

# Gabungkan keduanya
FINAL_STOPWORDS = BASE_STOPWORDS.union(CUSTOM_STOPWORDS)

def is_stopword(word):
    return word.lower() in FINAL_STOPWORDS