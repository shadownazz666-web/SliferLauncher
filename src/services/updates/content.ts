const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DETAILS",
  "DIV",
  "EM",
  "FIGCAPTION",
  "FIGURE",
  "H1",
  "H2",
  "H3",
  "H4",
  "HR",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "SUMMARY",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "title"]),
  IMG: new Set(["src", "alt", "title"]),
  DETAILS: new Set(["open"]),
};

const STEAM_TOKENS: Record<string, string> = {
  "{STEAM_CLAN_IMAGE}": "https://clan.fastly.steamstatic.com/images",
  "{STEAM_CLAN_LOC_IMAGE}": "https://clan.fastly.steamstatic.com/images",
  "{STEAM_APP_IMAGE}": "https://cdn.cloudflare.steamstatic.com/steam/apps",
};

export function prepareUpdateHtml(raw: string): string {
  const rewritten = rewriteSteamTokens(raw).trim();
  if (!rewritten) {
    return "";
  }

  const withBbcode = convertBbcode(rewritten);
  const withMarkup = looksLikeHtml(withBbcode) ? withBbcode : convertMarkdown(withBbcode);
  const sanitized = sanitizeHtml(withMarkup);
  return collapseHeadingSections(sanitized);
}

export function summarizeHtml(html: string, limit = 220): string {
  const text = decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit).trimEnd()}…`;
}

function rewriteSteamTokens(value: string): string {
  return Object.entries(STEAM_TOKENS).reduce(
    (current, [token, url]) => current.replaceAll(token, url),
    value,
  );
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function convertBbcode(value: string): string {
  let next = value;
  next = next.replace(
    /\[previewyoutube=([a-zA-Z0-9_-]+)[^\]]*\]\[\/previewyoutube\]/gi,
    '<p><a href="https://www.youtube.com/watch?v=$1">Watch on YouTube</a></p>',
  );
  next = next.replace(/\[img\]\s*(https?:\/\/[^\s[\]]+)\s*\[\/img\]/gi, '<img src="$1" alt="" />');
  next = next.replace(/\[img\s+src="(https?:\/\/[^"]+)"[^\]]*\]/gi, '<img src="$1" alt="" />');
  next = next.replace(/\[url=(https?:\/\/[^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$2</a>');
  next = next.replace(/\[url\]\s*(https?:\/\/[^\s[\]]+)\s*\[\/url\]/gi, '<a href="$1">$1</a>');
  next = next.replace(/\[h([1-4])\]([\s\S]*?)\[\/h\1\]/gi, "<h$1>$2</h$1>");
  next = next.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
  next = next.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
  next = next.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");
  next = next.replace(/\[strike\]([\s\S]*?)\[\/strike\]/gi, "<s>$1</s>");
  next = next.replace(
    /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi,
    "<details><summary>Spoiler</summary>$1</details>",
  );
  next = next.replace(
    /\[quote(?:=([^\]]+))?\]([\s\S]*?)\[\/quote\]/gi,
    (_match, author: string | undefined, body: string) =>
      `<blockquote>${author ? `<strong>${author}</strong><br />` : ""}${body}</blockquote>`,
  );
  next = next.replace(/\[hr\]/gi, "<hr />");
  next = next.replace(/\[olist\]/gi, "<ol>");
  next = next.replace(/\[\/olist\]/gi, "</ol>");
  next = next.replace(/\[list\]/gi, "<ul>");
  next = next.replace(/\[\/list\]/gi, "</ul>");
  next = next.replace(/\[\*\]\s*/g, "<li>");
  return next;
}

function convertMarkdown(value: string): string {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listKind: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listKind) {
      html.push(listKind === "ul" ? "</ul>" : "</ol>");
      listKind = null;
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const image = /^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/.exec(line.trim());
    if (image) {
      closeList();
      html.push(`<img src="${image[2]}" alt="${image[1]}" />`);
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      if (listKind !== "ul") {
        closeList();
        html.push("<ul>");
        listKind = "ul";
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      if (listKind !== "ol") {
        closeList();
        html.push("<ol>");
        listKind = "ol";
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join("");
}

function inlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function sanitizeHtml(raw: string): string {
  if (typeof DOMParser === "undefined") {
    return "";
  }
  const parsed = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
  const root = parsed.body.firstElementChild;
  if (!root) {
    return "";
  }
  cleanNode(root);
  return root.innerHTML;
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = child as HTMLElement;
    const tag = element.tagName.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element);
      }
      parent?.removeChild(element);
      if (parent) {
        cleanNode(parent);
      }
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed?.has(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
        continue;
      }
      if ((attr.name === "href" || attr.name === "src") && !isAllowedSrc(attr.value)) {
        element.removeAttribute(attr.name);
      }
    }

    if (tag === "A") {
      element.setAttribute("rel", "noopener noreferrer");
      element.setAttribute("target", "_blank");
    }

    cleanNode(element);
  }
}

function isAllowedSrc(value: string): boolean {
  try {
    const parsed = new URL(value, "https://store.steampowered.com");
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function collapseHeadingSections(html: string): string {
  if (typeof DOMParser === "undefined" || !html.includes("<h")) {
    return html;
  }

  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body.firstElementChild;
  if (!root) {
    return html;
  }

  const children = Array.from(root.childNodes);
  const rebuilt: Node[] = [];
  let index = 0;

  while (index < children.length) {
    const node = children[index];
    const heading = asHeading(node);
    if (!heading) {
      rebuilt.push(node);
      index += 1;
      continue;
    }

    const rank = headingRank(heading);
    const body: Node[] = [];
    let cursor = index + 1;
    while (cursor < children.length) {
      const nextHeading = asHeading(children[cursor]);
      if (nextHeading && headingRank(nextHeading) <= rank) {
        break;
      }
      body.push(children[cursor]);
      cursor += 1;
    }

    if (body.length === 0) {
      rebuilt.push(node);
      index += 1;
      continue;
    }

    const details = parsed.createElement("details");
    const summary = parsed.createElement("summary");
    summary.textContent = heading.textContent?.trim() || "Section";
    details.append(summary);
    for (const child of body) {
      details.append(child);
    }
    rebuilt.push(details);
    index = cursor;
  }

  root.replaceChildren(...rebuilt);
  return root.innerHTML;
}

function asHeading(node: Node): HTMLElement | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const element = node as HTMLElement;
  return /^H[1-4]$/.test(element.tagName) ? element : null;
}

function headingRank(element: HTMLElement): number {
  return Number(element.tagName.slice(1));
}

function decodeEntities(value: string): string {
  if (typeof document === "undefined") {
    return value;
  }
  const holder = document.createElement("textarea");
  holder.innerHTML = value;
  return holder.value;
}
