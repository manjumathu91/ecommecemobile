"""Invoice PDF generation. render_invoice_pdf() takes plain data so it can be tested without Django."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _money(v):
    return f"Rs. {float(v):,.2f}"


def render_invoice_pdf(data):
    """data: order_number, date, customer, shipping_address, payment_method, payment_status,
    items=[{name, qty, unit_price, line_total}], items_total, coupon_code, coupon_discount, delivery_charge, total_amount"""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                            title=f"Invoice {data['order_number']}")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("TAX INVOICE", styles["Title"]),
        Paragraph(f"<b>Invoice / Order No:</b> {data['order_number']}<br/><b>Date:</b> {data['date']}", styles["Normal"]),
        Spacer(1, 6 * mm),
        Paragraph(f"<b>Billed to:</b> {data['customer']}<br/>{data['shipping_address']}", styles["Normal"]),
        Spacer(1, 3 * mm),
        Paragraph(f"<b>Payment:</b> {data['payment_method']} ({data['payment_status']})", styles["Normal"]),
        Spacer(1, 6 * mm),
    ]
    rows = [["Item", "Qty", "Unit price", "Amount"]]
    rows += [[Paragraph(i["name"], styles["Normal"]), i["qty"], _money(i["unit_price"]), _money(i["line_total"])] for i in data["items"]]
    rows.append(["", "", "Items total", _money(data["items_total"])])
    if float(data["coupon_discount"]) > 0:
        rows.append(["", "", f"Coupon {data['coupon_code']}", "- " + _money(data["coupon_discount"])])
    rows.append(["", "", "Delivery", _money(data["delivery_charge"])])
    rows.append(["", "", "TOTAL", _money(data["total_amount"])])
    n_items = len(data["items"])
    table = Table(rows, colWidths=[85 * mm, 15 * mm, 35 * mm, 35 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222222")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, n_items), 0.3, colors.grey),
        ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (2, n_items + 1), (-1, n_items + 1), 0.5, colors.black),
    ]))
    story += [table, Spacer(1, 10 * mm), Paragraph("Thank you for shopping with us.", styles["Italic"])]
    doc.build(story)
    return buf.getvalue()
