// Privacy.jsx — страница «Политика конфиденциальности».
// PDF-файл подгружается из src/assets/privacy_policy.pdf (обычный asset-импорт Vite),
// поэтому достаточно заменить файл с тем же именем — страница обновится сама.
import DocumentPage from '../components/DocumentPage';
import privacyPdf from '../assets/privacy_policy.pdf';
import './privacy.css';

export default function Privacy() {
  return <DocumentPage title="Политика конфиденциальности" pdf={privacyPdf} />;
}
