import { formatDistanceToNowStrict, isValid } from 'date-fns';
import { Link } from 'react-router-dom';

export const getUrl = (img) => {
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('//') || img.startsWith('blob:')) return img;
    return `http://localhost:5000/uploads/${img}`;
};

export const formatShortTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!isValid(date)) return '';
  
  return formatDistanceToNowStrict(date)
    .replace(' seconds', 's').replace(' second', 's')
    .replace(' minutes', 'm').replace(' minute', 'm')
    .replace(' hours', 'h').replace(' hour', 'h')
    .replace(' days', 'd').replace(' day', 'd');
};

export const formatContent = (text) => {
  if (!text) return null;
  return text.split(/((?:@|#)[\w]+)/g).map((part, i) => {
    if (part.startsWith('@')) {
      return <Link key={i} to={`/profile/${part.slice(1)}`} onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:underline font-medium">{part}</Link>;
    } else if (part.startsWith('#')) {
      return <span key={i} className="text-blue-500 font-medium cursor-pointer hover:underline">{part}</span>;
    }
    return part;
  });
};