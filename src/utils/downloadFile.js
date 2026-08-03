function removeControlCharacters(value) {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
}

function normalizeFilenamePart(value, fallback = "Export") {
  const normalized = removeControlCharacters(String(value ?? ""))
    .normalize("NFKC")
    .replace(/[\\/:?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return normalized || fallback;
}

export function buildDownloadFilename(parts, extension = "xlsx") {
  const safeParts = (parts ?? [])
    .map((part) => normalizeFilenamePart(part, ""))
    .filter(Boolean);
  const safeExtension =
    String(extension ?? "xlsx")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "xlsx";

  return `${safeParts.join(" - ")}.${safeExtension}`;
}

export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) {
    throw new Error("The generated download is invalid.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = normalizeFilenamePart(filename, "BioPlex Inventory.xlsx");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
