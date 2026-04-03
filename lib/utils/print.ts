export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const styles = document.querySelectorAll("style, link[rel='stylesheet']");
  styles.forEach((styleNode) => doc.head.appendChild(styleNode.cloneNode(true)));

  doc.documentElement.dir = "rtl";
  doc.body.innerHTML = `<div class="p-8 bg-white text-black print-wrapper">${element.innerHTML}</div>`;

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

