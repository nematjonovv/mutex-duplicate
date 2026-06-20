import React, { forwardRef } from "react";


interface Column {
    title: string;
    dataIndex: string;
    render?: (value: any, record: any) => React.ReactNode;
}

interface PrintableTableProps {
    title: string;
    columns: Column[];
    data: any[];
}

export const PrintableTable = forwardRef<HTMLDivElement, PrintableTableProps>(
    ({ title, columns, data }, ref) => {
        return (
            <div ref={ref} className="p-8 print-content">
                <style type="text/css" media="print">
                    {`
            @page { size: landscape; margin: 20mm; }
            body { -webkit-print-color-adjust: exact; }
            .print-content { width: 100%; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
            .footer { margin-top: 40px; text-align: right; font-size: 12px; }
          `}
                </style>
                <h1>{title}</h1>
                <table>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.dataIndex}>{col.title}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={item._id || index}>
                                {columns.map((col) => {
                                    const value = item[col.dataIndex];
                                    return (
                                        <td key={col.dataIndex}>
                                            {col.render ? col.render(value, item) : value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="footer">
                    <p>Chop etilgan sana: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        );
    }
);

PrintableTable.displayName = "PrintableTable";
