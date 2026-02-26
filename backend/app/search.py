def search_similar_chunks(query, top_k=5):
    print("Query:", query)

    query_embedding = model.encode(query).reshape(1, -1)

    results = collection.find({})

    similarities = []

    for doc in results:
        if "embedding" not in doc or "text" not in doc:
            continue

        doc_embedding = np.array(doc["embedding"]).reshape(1, -1)
        score = cosine_similarity(query_embedding, doc_embedding)[0][0]

        similarities.append((doc["text"], score))

    similarities.sort(key=lambda x: x[1], reverse=True)

    print("Top Similarities:")
    for text, score in similarities[:top_k]:
        print(f"Score: {score:.4f} | Text: {text[:80]}")

    return similarities[:top_k]