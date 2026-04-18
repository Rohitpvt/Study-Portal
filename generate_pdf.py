from reportlab.pdfgen import canvas

def create_syllabi_pdf(filename):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "Christ University - BCA Syllabus")
    c.drawString(100, 730, "Course: Introduction to Computer Science")
    c.drawString(100, 710, "Unit 1: Hardware & Software Concepts")
    c.drawString(100, 690, "Topics: CPU, RAM, ALU, CU, Binary Systems")
    c.drawString(100, 670, "Unit 2: Networking Basics")
    c.drawString(100, 650, "Topics: OSI Model, TCP/IP, DNS, HTTP, Routers")
    c.save()
    print(f"Created {filename} successfully.")

if __name__ == '__main__':
    create_syllabi_pdf("e2e_test_syllabi.pdf")
