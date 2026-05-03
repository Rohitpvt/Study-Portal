import os
import uuid
import boto3
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.material import Material, Category, MaterialIntegrityStatus

from app.core.config import settings
from app.models.base import generate_uuid


# AWS S3 Configuration
s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)
BUCKET_NAME = settings.AWS_BUCKET_NAME

BATCH_4_FILES = [
    ("Microservices Architecture", "Advanced Computing", "Microservices vs Monoliths, API Gateways, Service Discovery, Circuit Breakers."),
    ("Blockchain Fundamentals", "Cryptography", "Decentralization, Hash functions, Consensus algorithms, Smart contracts, Bitcoin vs Ethereum."),
    ("Internet of Things (IoT)", "Electronics", "Sensors, Actuators, MQTT protocol, Edge computing, IoT security layers."),
    ("Natural Language Processing (NLP)", "Artificial Intelligence", "Tokenization, Stemming, Lemmatization, Word Embeddings, Transformers, BERT."),
    ("Cloud Security Best Practices", "Cloud Computing", "IAM, VPC, Encryption at rest/transit, Shared responsibility model."),
    ("DevOps & CI/CD Pipelines", "Software Engineering", "Jenkins, Docker, GitLab CI, Automated testing, Deployment strategies."),
    ("Distributed Databases", "DBMS", "CAP Theorem, Eventual consistency, Sharding, Replication, Cassandra, MongoDB."),
    ("GraphQL vs REST", "Web Technologies", "Query language for APIs, Over-fetching vs Under-fetching, Resolvers, Schema definition."),
    ("Kubernetes Orchestration", "Cloud Computing", "Pods, Services, Deployments, ConfigMaps, Helm charts, Scaling."),
    ("Cyber Forensics", "Cyber Security", "Digital evidence, Chain of custody, Disk imaging, Memory forensics, Legal implications."),
    ("Digital Image Processing", "Mathematics", "Pixels, Gradients, Filtering, Edge detection, Morphological operations."),
    ("Graph Theory in CS", "Discrete Mathematics", "Nodes, Edges, BFS, DFS, Dijkstra's algorithm, Graph coloring."),
    ("Parallel Computing", "Computer Architecture", "Multithreading, MPI, OpenMP, Speedup, Amdahl's Law."),
    ("Computer Vision Basics", "Artificial Intelligence", "Object detection, YOLO, CNNs, Feature extraction, OpenCV."),
    ("Ethical Hacking", "Cyber Security", "Vulnerability assessment, Penetration testing, SQL injection, XSS, Kali Linux."),
    ("Data Mining & Warehousing", "DBMS", "ETL process, OLAP vs OLTP, Association rules, Clustering, K-means."),
    ("Soft Computing", "Artificial Intelligence", "Fuzzy logic, Genetic algorithms, Neural networks, Probabilistic reasoning."),
    ("Game Development with Unity", "Graphics", "Game engines, C# scripting, Prefabs, Physics engine, UI systems."),
    ("Compiler Design", "Computer Science", "Lexical analysis, Parsing, Semantic analysis, Optimization, Code generation."),
    ("Automata Theory", "Theoretical CS", "Finite automata, Context-free grammars, Turing machines, Decidability."),
    ("Operations Research", "Mathematics", "Linear programming, Simplex method, Queuing theory, Optimization."),
    ("Information Retrieval", "Data Science", "TF-IDF, Precision, Recall, F1-score, Vector space model, PageRank."),
    ("Cryptography (RSA/AES)", "Cyber Security", "Asymmetric vs Symmetric encryption, Key exchange, Digital signatures."),
    ("Network Security", "Computer Networks", "Firewalls, IDS/IPS, VPN, SSL/TLS, Zero Trust Architecture."),
    ("Human-Computer Interaction (HCI)", "Design", "Usability, Accessibility, UX/UI principles, User-centered design."),
    ("Augmented Reality (AR)", "Graphics", "Marker-based AR, SLAM, Unity AR Foundation, Mobile AR."),
    ("Bioinformatics", "Science", "DNA sequencing, Sequence alignment, Protein structure prediction."),
    ("Geospatial Data Analysis", "Data Science", "GIS, Coordinate systems, Spatial queries, PostGIS."),
    ("Embedded Systems", "Electronics", "Microcontrollers, RTOS, Firmware development, Interrupts."),
    ("Real-Time Systems", "Operating Systems", "Scheduling, Determinism, Hard vs Soft real-time, Rate monotonic."),
    ("VLSI Design", "Electronics", "Transistors, Logic gates, Layout design, FPGA, Verilog/VHDL."),
    ("Wireless Sensor Networks", "Networking", "Sensor nodes, Energy efficiency, Routing protocols, Data aggregation."),
    ("Ad-hoc Networks", "Networking", "MANETs, VANETs, Dynamic topology, Self-healing networks."),
    ("5G Technology", "Telecommunications", "Millimeter wave, Massive MIMO, Beamforming, Network slicing."),
    ("Edge Computing", "Cloud Computing", "Low latency, Decentralized processing, Fog computing, IoT integration."),
    ("Serverless Computing", "Cloud Computing", "AWS Lambda, Function-as-a-Service, Event-driven architecture."),
    ("Data Privacy Laws", "Law & Tech", "GDPR, CCPA, Data protection officers, Privacy by design."),
    ("Intellectual Property Rights", "Law & Tech", "Patents, Copyrights, Trademarks, Trade secrets, Licensing."),
    ("Management Information Systems", "Management", "Decision support systems, Executive information systems, ERP."),
    ("E-commerce Architecture", "Web Technologies", "Shopping carts, Payment gateways, Inventory management, Security."),
    ("Social Media Analytics", "Data Science", "Graph analytics, Community detection, Influence mapping."),
    ("Sentiment Analysis", "NLP", "Polarity, Subjectivity, Aspect-based sentiment, Vader, TextBlob."),
    ("Recommendation Systems", "Machine Learning", "Collaborative filtering, Content-based filtering, Hybrid models."),
    ("Reinforcement Learning", "Machine Learning", "Agents, Rewards, Policy, Value iteration, Q-learning."),
    ("Generative AI Basics", "Artificial Intelligence", "GANs, VAEs, Diffusion models, Prompt engineering."),
    ("Prompt Engineering", "Artificial Intelligence", "Chain of thought, Few-shot prompting, Temperature, Top-p."),
    ("Big Data Ethics", "Data Science", "Bias in AI, Algorithmic transparency, Data ownership."),
    ("Sustainable Tech", "Environment", "E-waste management, Energy-efficient algorithms, Green data centers."),
    ("Green Computing", "Environment", "Carbon footprint of AI, Sustainable hardware, Resource optimization."),
    ("Quantum Cryptography", "Quantum Computing", "QKD, BB84 protocol, Post-quantum cryptography.")
]

async def ingest_batch_4():
    print(f"--- BATCH 4 INGESTION: {len(BATCH_4_FILES)} FILES ---")
    async with AsyncSessionLocal() as db:
        # Check current count
        res = await db.execute(select(Material))
        before_count = len(res.scalars().all())
        print(f"Current Materials: {before_count}")

        uploaded_materials = []

        for title, subject, content in BATCH_4_FILES:
            file_name = f"{title.replace(' ', '_').lower()}.txt"
            file_key = f"materials/batch4/{file_name}"
            
            # 1. Upload to S3
            try:
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=file_key,
                    Body=content.encode("utf-8"),
                    ContentType="text/plain"
                )
                print(f"  [S3] Uploaded: {file_key}")
            except Exception as e:
                print(f"  [S3] FAILED: {file_name} -> {e}")
                continue

            # 2. Create DB Record
            new_material = Material(
                id=generate_uuid(),
                title=title,
                subject=subject,
                course="Computer Science",
                semester=4,
                category=Category.NOTES,
                file_path=f"https://{BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{file_key}",
                file_key=file_key,
                file_name=file_name,
                file_size=len(content),
                file_type="text/plain",
                is_approved=True,
                integrity_status=MaterialIntegrityStatus.available,
                uploader_id="d7df563e-baa1-426c-8c35-1ace26a6105f" # Admin
            )

            db.add(new_material)
            uploaded_materials.append(new_material)
        
        await db.commit()
        
        # Verify final count
        res = await db.execute(select(Material))
        after_count = len(res.scalars().all())
        print(f"\nIngestion Complete. Total Materials: {after_count} (Added {after_count - before_count})")
        return uploaded_materials

if __name__ == "__main__":
    asyncio.run(ingest_batch_4())
