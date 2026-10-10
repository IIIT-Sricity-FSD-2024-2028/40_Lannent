/**
 * LANNENT — PageStyle
 * Renders a page's own <style> block (moved verbatim from that page's HTML
 * into a sibling .css file) only while the page is on screen.
 *
 * Why not a normal CSS import? Many pages reuse the same class names with
 * different rules (.form-group, .empty-state, .status-badge, ...). In the
 * original app each page only ever had its own <style>, so importing them all
 * globally would make pages restyle each other. Rendering the CSS with the
 * page keeps every page looking exactly as it did.
 *
 *   import pageCss from './ClientWallet.css?raw';
 *   <PageStyle css={pageCss} />
 */
export default function PageStyle({ css }) {
  return <style>{css}</style>;
}
