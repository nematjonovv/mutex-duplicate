import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (
    data: any[],
    fileName: string,
    columnWidths?: { wch: number }[]
) => {
    const worksheet = XLSX.utils.json_to_sheet(data);

    if (columnWidths) {
        worksheet["!cols"] = columnWidths;
    }

    const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(dataBlob, `${fileName}.xlsx`);
};
