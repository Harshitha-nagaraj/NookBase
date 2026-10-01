import os

# Define basic configuration variables here, loaded from environment variables
CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./data/chromadb")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

# Chunking Configuration
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))

# Diagnostics Configuration - Heuristic Thresholds (Lower distance is better for L2)
# These are heuristic initial thresholds for L2 distance, not universally valid.
DISTANCE_THRESHOLD_HIGH = float(os.getenv("DISTANCE_THRESHOLD_HIGH", "1.0"))
DISTANCE_THRESHOLD_MEDIUM = float(os.getenv("DISTANCE_THRESHOLD_MEDIUM", "1.5"))

# Grounding Diagnostics Configuration
# Threshold for claim support (using L2 distance from embedding service)
GROUNDING_DISTANCE_THRESHOLD = float(os.getenv("GROUNDING_DISTANCE_THRESHOLD", "1.2"))

# Efficiency Diagnostics Configuration
CHARS_PER_TOKEN = float(os.getenv("CHARS_PER_TOKEN", "4.0"))
EXCESS_CONTEXT_THRESHOLD = int(os.getenv("EXCESS_CONTEXT_THRESHOLD", "3"))

# Evaluation Configuration
# The values of K for which to compute Precision and Recall
EVALUATION_K_VALUES = [int(k.strip()) for k in os.getenv("EVALUATION_K_VALUES", "1,3,5").split(",")]

# Threshold for answer relevance (using L2 distance from embedding service)
ANSWER_RELEVANCE_DISTANCE_THRESHOLD = float(os.getenv("ANSWER_RELEVANCE_DISTANCE_THRESHOLD", "1.2"))

# Optimization Experiment Configuration
# Threshold for retaining chunks in the optimized pipeline (lower L2 is better)
OPTIMIZATION_DISTANCE_THRESHOLD = float(os.getenv("OPTIMIZATION_DISTANCE_THRESHOLD", "1.5"))
OPTIMIZATION_TOP_K = int(os.getenv("OPTIMIZATION_TOP_K", "5"))





