import React, { forwardRef } from "react";
import Barcode from "react-barcode";

export interface BarcodeItem {
    code: string;
    productName?: string;
    color?: string;
    colorCode?: string;
    weight?: number;
    date?: string;
    description?: string;
    conesCount?: number;
    tara?: number;
    packageNumber?: number; // Added packageNumber
}

interface PrintableBarcodeProps {
    value?: string;
    values?: string[];
    items?: BarcodeItem[];
}

export const PrintableBarcode = forwardRef<HTMLDivElement, PrintableBarcodeProps>(
    ({ value, values, items }, ref) => {
        if (!value && (!values || values.length === 0) && (!items || items.length === 0)) return null;

        const isDetailed = items && items.length > 0;
        const content = isDetailed ? items : (values && values.length > 0 ? values : (value ? [value] : []));

        return (
            <div ref={ref} style={{ width: "100%" }}>
                {isDetailed && (
                    <style>
                        {`
                            @media print {
                                @page {
                                    size: 15cm 15cm;
                                    margin: 0;
                                }
                                body {
                                    margin: 0;
                                    padding: 0;
                                    -webkit-print-color-adjust: exact;
                                    print-color-adjust: exact;
                                }
                                /* Brauzer header/footer ni yashirish */
                                html {
                                    margin: 0;
                                    padding: 0;
                                }
                                title, head {
                                    display: none;
                                }
                            }
                            /* Print dialog uchun header/footer o'chirish */
                            @page {
                                margin: 0;
                            }
                        `}
                    </style>
                )}
                {content.map((item, index) => {
                    const code = typeof item === 'string' ? item : item.code;
                    const details = typeof item === 'object' ? item : null;

                    return (
                        <div
                            key={index}
                            style={isDetailed ? {
                                width: "15cm",
                                height: "15cm",
                                padding: "0.8cm",
                                boxSizing: "border-box",
                                pageBreakAfter: index < content.length - 1 ? "always" : "auto",
                                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                backgroundColor: "white",
                                position: "relative",
                                border: "1px solid #eee" // Visible in preview
                            } : {
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                minHeight: "100vh",
                                padding: "20px",
                                pageBreakAfter: index < content.length - 1 ? "always" : "auto",
                            }}
                        >
                            {details ? (
                                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                                    {/* Header */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                        <div>
                                            <div style={{ fontSize: "38px", fontWeight: "900", letterSpacing: "-1px", lineHeight: "0.9", fontFamily: "Arial Black, sans-serif" }}>MUTex</div>
                                            {details.packageNumber && (
                                                <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "4px" }}>N:{details.packageNumber}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: "right", fontSize: "12px", color: "#333", lineHeight: "1.2" }}>
                                            <strong>MUTex Textile</strong><br/>
                                            Marg'ilon, Uzbekistan
                                            <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "3px" }}>{details.date}</div>
                                        </div>
                                    </div>

                                    {/* Product Name */}
                                    <div style={{ marginBottom: "12px", textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px" }}>
                                        <div style={{ fontSize: "36px", fontWeight: "bold", lineHeight: "1" }}>
                                            {details.productName || "Product Name"}
                                        </div>
                                        {details.description && (
                                            <div style={{ fontSize: "20px", marginTop: "4px", fontWeight: "600" }}>
                                                {details.description}
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Grid */}
                                    <div style={{ flex: 1 }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "18px", lineHeight: "1.3" }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ fontWeight: "bold", paddingBottom: "6px" }}>RANG</td>
                                                    <td style={{ paddingBottom: "6px" }}>: {details.color} {details.colorCode ? `(${details.colorCode})` : ""}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Weight Section - Boxed */}
                                        {(() => {
                                            const brutto = details.weight || 0;
                                            const tara = details.tara || 0;
                                            const netto = brutto - tara;
                                            const hasTara = tara > 0;

                                            if (!hasTara) {
                                                // Oddiy ko'rinish - faqat vazn (TARA yo'q)
                                                return (
                                                    <div style={{ marginTop: "12px", border: "3px solid #000", padding: "10px", borderRadius: "8px" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                                            <span style={{ fontSize: "18px", fontWeight: "bold" }}>VAZN</span>
                                                            <span style={{ fontFamily: "monospace", fontSize: "32px", fontWeight: "bold", lineHeight: "1" }}>{brutto.toFixed(2)} <span style={{fontSize: "18px"}}>KG</span></span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // To'liq ko'rinish - BRUTTO, TARA, NETTO
                                            return (
                                                <div style={{ marginTop: "12px", border: "3px solid #000", padding: "10px", borderRadius: "8px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "6px" }}>
                                                        <span style={{ fontSize: "16px", fontWeight: "bold" }}>BRUTTO</span>
                                                        <span style={{ fontFamily: "monospace", fontSize: "26px", fontWeight: "bold", lineHeight: "1" }}>{brutto.toFixed(2)} <span style={{fontSize: "16px"}}>KG</span></span>
                                                    </div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "14px" }}>
                                                        <span style={{ fontWeight: "bold" }}>TARA </span>
                                                        <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{tara.toFixed(2)} KG</span>
                                                    </div>
                                                    <div style={{ borderTop: "2px solid #000", margin: "6px 0" }}></div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                                        <span style={{ fontSize: "18px", fontWeight: "bold" }}>NETTO</span>
                                                        <span style={{ fontFamily: "monospace", fontSize: "32px", fontWeight: "bold", lineHeight: "1" }}>{netto.toFixed(2)} <span style={{fontSize: "18px"}}>KG</span></span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", marginTop: "15px", paddingTop: "8px" }}>
                                        <div style={{ textAlign: "center" }}>
                                            <Barcode value={code} width={2.5} height={70} fontSize={10} displayValue={false} />
                                            <div style={{fontSize: "28px", fontWeight: "bold", marginTop: "4px", letterSpacing: "2px"}}>{code}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Barcode value={code} width={2} height={100} fontSize={20} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
);

PrintableBarcode.displayName = "PrintableBarcode";
