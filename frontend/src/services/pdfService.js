import api from "./api";

const PDFService = {
  generatePDF: async () => {
    const response = await api.get(
      "/pdf-report/",
      {
        responseType: "blob",
      }
    );

    const blob = new Blob(
      [response.data],
      {
        type: "application/pdf",
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "Business_Copilot_Report.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  },
};

export default PDFService;