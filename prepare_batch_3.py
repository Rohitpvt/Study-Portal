import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Subjects and content snippets for 30 files
BATCH_3_DATA = [
    {"title": "AI Ethics and Governance", "subject": "Artificial Intelligence", "content": "Ethics in AI focuses on the moral implications of automated systems. Key topics: Bias, Accountability, Transparency, and Human Agency."},
    {"title": "Cloud Architecture Patterns", "subject": "Cloud Computing", "content": "Microservices, Serverless, and Event-driven architectures are common in modern cloud systems. Scalability and fault tolerance are critical."},
    {"title": "Principles of Microeconomics", "subject": "Economics", "content": "Microeconomics studies the behavior of individuals and firms in making decisions regarding the allocation of scarce resources."},
    {"title": "Global Macroeconomic Trends", "subject": "Economics", "content": "Macroeconomics deals with the performance, structure, behavior, and decision-making of an economy as a whole."},
    {"title": "Digital Marketing Strategy", "subject": "Marketing", "content": "SEO, SEM, and Content Marketing are pillars of digital presence. Understanding user intent is key to successful campaigns."},
    {"title": "Advanced Java Concurrency", "subject": "Java Programming", "content": "Java's java.util.concurrent package provides high-level utilities for multi-threading. Synchronizers, Executors, and Concurrent Collections."},
    {"title": "Python for Big Data", "subject": "Python", "content": "Python is the leading language for data science. Libraries like Pandas, NumPy, and PySpark enable large-scale data processing."},
    {"title": "Flutter Widget Mastery", "subject": "Mobile Development", "content": "Everything in Flutter is a widget. Stateless and Stateful widgets form the building blocks of cross-platform UI."},
    {"title": "Automation Testing with Selenium", "subject": "Software Engineering", "content": "Selenium WebDriver allows automated browser testing. Page Object Model (POM) is a design pattern to improve test maintenance."},
    {"title": "Information Technology Law 2026", "subject": "Law", "content": "Cyber laws govern the use of information technology. Key areas: Data Protection, Intellectual Property, and Cybercrime prevention."},
    {"title": "Big Data Engineering with Hadoop", "subject": "Data Science", "content": "Hadoop HDFS and MapReduce provide the foundation for storing and processing massive datasets in a distributed environment."},
    {"title": "Parallel Algorithms and Architectures", "subject": "Computer Science", "content": "Parallel computing involves executing multiple tasks simultaneously. CUDA and OpenMP are common frameworks for parallelization."},
    {"title": "Applied Graph Theory", "subject": "Mathematics", "content": "Graphs are mathematical structures used to model pairwise relations between objects. Applications: Network Routing, Social Networks."},
    {"title": "Linear Programming and OR", "subject": "Mathematics", "content": "Operations Research uses mathematical modeling to find optimal solutions. Linear programming is a technique for optimizing linear objective functions."},
    {"title": "HCI and User Experience Design", "subject": "Design", "content": "Human-Computer Interaction focuses on the interfaces between people and computers. Usability and Accessibility are core principles."},
    {"title": "Embedded Systems Programming", "subject": "Electronics", "content": "Embedded systems are dedicated computer systems within larger mechanical or electrical systems. C and Assembly are common languages."},
    {"title": "Internet of Things (IoT) Protocols", "subject": "Computer Networks", "content": "IoT involves connecting physical devices to the internet. MQTT, CoAP, and HTTP are common communication protocols."},
    {"title": "NLP with Transformers", "subject": "Artificial Intelligence", "content": "Natural Language Processing has been revolutionized by Transformer models. Attention mechanisms allow modeling long-range dependencies."},
    {"title": "Computer Graphics and Ray Tracing", "subject": "Computer Science", "content": "Computer graphics involves generating images with computers. Ray tracing simulates the physical behavior of light to achieve realism."},
    {"title": "Automata and Formal Languages", "subject": "Theory", "content": "Theory of Computation explores the capabilities and limitations of computers. Deterministic and Non-deterministic Finite Automata (DFA/NFA)."},
    {"title": "Modern Cryptography Basics", "subject": "Cyber Security", "content": "Cryptography secures information from adversaries. AES, RSA, and Elliptic Curve Cryptography (ECC) are widely used."},
    {"title": "Blockchain and Smart Contracts", "subject": "Computer Science", "content": "Blockchain is a distributed ledger technology. Smart contracts are self-executing contracts with the terms directly written into code."},
    {"title": "Introduction to Quantum Computing", "subject": "Theory", "content": "Quantum computing uses quantum-mechanical phenomena like superposition and entanglement to perform calculations beyond classical limits."},
    {"title": "Bioinformatics and DNA Sequencing", "subject": "Biology", "content": "Bioinformatics uses computational tools to analyze biological data. Sequence alignment and structural prediction are key tasks."},
    {"title": "Digital Image Processing Basics", "subject": "Computer Science", "content": "Image processing involves manipulating digital images using algorithms. Key operations: Filtering, Edge Detection, Compression."},
    {"title": "Wireless Sensor Network Security", "subject": "Computer Networks", "content": "WSNs consist of spatially distributed autonomous sensors. Security challenges: Energy constraints, Denial of Service (DoS) attacks."},
    {"title": "Ethical Hacking and Pen Testing", "subject": "Cyber Security", "content": "Ethical hacking involves testing systems for vulnerabilities. Reconnaissance, Scanning, Exploitation, and Post-exploitation."},
    {"title": "Data Mining and Pattern Recognition", "subject": "Data Science", "content": "Data mining discovers patterns in large data sets. Techniques: Clustering, Classification, Association Rule Learning."},
    {"title": "Distributed Database Systems", "subject": "Database", "content": "Distributed databases store data across multiple physical locations. Consistency, Availability, and Partition tolerance (CAP Theorem)."},
    {"title": "Game Engine Architecture Basics", "subject": "Game Development", "content": "Game engines provide the core technology for video games. Components: Rendering Engine, Physics Engine, Audio Engine."}
]

OUTPUT_DIR = "batch3_materials"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_pdf(filename, title, subject, content):
    path = os.path.join(OUTPUT_DIR, filename)
    c = canvas.Canvas(path, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, height - 72, title)
    
    c.setFont("Helvetica", 12)
    c.drawString(72, height - 90, f"Subject: {subject}")
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(72, height - 105, "Academic Study Material - Batch 3 Scaling Test")
    
    c.setFont("Helvetica", 11)
    text_object = c.beginText(72, height - 150)
    text_object.setLeading(14)
    
    # Repeat content to make it a bit longer
    for _ in range(5):
        text_object.textLine(content)
        text_object.textLine("")
    
    c.drawText(text_object)
    c.save()
    print(f"Created PDF: {filename}")

def create_txt(filename, title, subject, content):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"TITLE: {title}\n")
        f.write(f"SUBJECT: {subject}\n")
        f.write("-" * 40 + "\n")
        # Repeat content to make it a bit longer
        for _ in range(10):
            f.write(content + "\n\n")
    print(f"Created TXT: {filename}")

for i, data in enumerate(BATCH_3_DATA):
    safe_title = data["title"].replace(" ", "_").replace("(", "").replace(")", "")
    if i < 15:
        create_txt(f"{safe_title}.txt", data["title"], data["subject"], data["content"])
    else:
        create_pdf(f"{safe_title}.pdf", data["title"], data["subject"], data["content"])

print(f"\nSuccessfully generated 30 files in {OUTPUT_DIR}/")
