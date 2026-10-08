import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CircleNotch, DotsThree } from 'phosphor-react';

const TrendingList = ({ isMobile = false }) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/posts/trending');
        setTrends(res.data);
      } catch (err) {
        console.error("Trending error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, []);

  const handleTrendClick = (topic) => {
    navigate(`/explore?q=${encodeURIComponent(topic)}`);
  };

  // [BARU] Helper Warna Kategori AI
  const getCategoryColor = (cat) => {
    switch (cat) {
        case "Olahraga": return "text-orange-600 bg-orange-50";
        case "Politik & Hukum": return "text-red-600 bg-red-50";
        case "Teknologi": return "text-blue-600 bg-blue-50";
        case "Hiburan": return "text-purple-600 bg-purple-50";
        case "Bencana & Alam": return "text-amber-600 bg-amber-50";
        case "Geopolitik": return "text-slate-600 bg-slate-100";
        default: return "text-gray-500 bg-gray-100"; // Untuk "Trending" biasa
    }
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <CircleNotch size={24} className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className={`flex flex-col ${!isMobile ? 'bg-slate-50/50 rounded-2xl overflow-hidden' : ''}`}>
      {!isMobile && (
        <div className="px-4 py-3 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
          <h3 className="font-black text-xl text-slate-900">Apa yang sedang terjadi?</h3>
        </div>
      )}

      {trends.length > 0 ? trends.map((trend, index) => {
        return (
          <div 
            key={index}
            onClick={() => handleTrendClick(trend.topic || trend.tag)} 
            className="px-4 py-3 hover:bg-slate-100/80 cursor-pointer transition-all border-b border-slate-50 last:border-0 group relative"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                {/* Baris Atas: Ranking + Kategori AI */}
                <div className="flex items-center flex-wrap gap-2 mb-0.5">
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-1">
                    <span>{index + 1}</span>
                    <span>·</span>
                    {/* [BARU] Badge Kategori */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getCategoryColor(trend.category)}`}>
                        {trend.category || "Trending"}
                    </span>
                  </p>
                </div>

                {/* Judul Trending */}
                <p className="font-bold text-[15px] text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                  {trend.topic || trend.tag}
                </p>

                {/* Hype Score Indicator */}
                <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="text-blue-600 font-bold font-mono">
                     {trend.score ? trend.score.toFixed(1) : 0}
                  </span>
                  <span>Hype Score</span>
                  <span className="mx-1">•</span>
                  <span>{trend.posts}</span>
                </p>
              </div>

              <div className="p-2 hover:bg-blue-50 rounded-full text-slate-300 hover:text-blue-500 transition-colors">
                 <DotsThree size={18} weight="bold" />
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="p-10 text-center text-slate-400 text-sm italic">
          Belum ada topik hangat saat ini.
        </div>
      )}

      {!isMobile && (
        <button 
          onClick={() => navigate('/explore')}
          className="p-4 text-sm text-blue-500 font-bold hover:bg-slate-100 transition-colors text-left"
        >
          Tampilkan lebih banyak
        </button>
      )}
    </div>
  );
};

export default TrendingList;