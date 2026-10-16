// DocumentPage.jsx — полноэкранный просмотр PDF-документа, файл подставляется
// из src/assets обычным asset-импортом Vite (замените файл — страница обновится).
export default function DocumentPage({ title, pdf }) {
  return (
    <main className="pdf-page">
      <iframe className="pdf-viewer" src={pdf} title={title} />
    </main>
  );
}