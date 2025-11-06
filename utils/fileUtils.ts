
export const downloadJson = (data: object, filename: string) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = filename;
  link.click();
};

export const downloadMarkdown = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


export const uploadJson = <T,>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = JSON.parse(event.target?.result as string) as T;
        resolve(result);
      } catch (error) {
        reject(new Error("Failed to parse JSON file."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };
    reader.readAsText(file);
  });
};
