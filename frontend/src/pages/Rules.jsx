// Rules.jsx — страница «Правила пользования».
// PDF-файл подгружается из src/assets/rules.pdf (обычный asset-импорт Vite),
// поэтому достаточно заменить файл с тем же именем — страница обновится сама.
import DocumentPage from '../components/DocumentPage';
import rulesPdf from '../assets/rules.pdf';
import './privacy.css';

export default function Rules() {
  return <DocumentPage title="Правила пользования" pdf={rulesPdf} />;
}