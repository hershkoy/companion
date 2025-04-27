import requests
import time
import json

API_URL = "http://localhost:11434/api"
MODEL = "llama3"  #"deepseek-r1"

def wait_for_ollama_ready(model_name, timeout=300):
    url = f"{API_URL}/tags"
    print(f"Waiting for model '{model_name}'…", end="", flush=True)
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=5)
            r.raise_for_status()
            names = [m["name"].split(":")[0] for m in r.json().get("models", [])]
            if model_name in names:
                print(" ready!")
                return True
        except:
            pass
        print(".", end="", flush=True)
        time.sleep(2)
    print("\nTimed out.")
    return False

def pull_model(model_name):
    url = f"{API_URL}/pull"
    print(f"Pull-checking '{model_name}'…", end="", flush=True)
    start = time.time()
    r = requests.post(url, json={"name": model_name}, timeout=300)
    r.raise_for_status()
    print(f" done in {time.time()-start:.1f}s\n")

def generate_from_history(history, timeout=300):
    prompt = "\n".join(history) + "\nAssistant:"
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }
    start = time.time()
    r = requests.post(f"{API_URL}/generate", json=payload, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    elapsed = time.time() - start
    return data["response"], elapsed

def chat_loop(initial_messages):
    history = []
    # Seed history with roles
    for role, msg in initial_messages:
        prefix = "User:" if role=="user" else "Assistant:"
        history.append(f"{prefix} {msg}")

    # Now for each user turn, generate assistant reply
    for role, msg in initial_messages[len(history):]:
        if role != "user":
            continue
        history.append(f"User: {msg}")
        print(f"\n>>> User: {msg}")
        reply, t = generate_from_history(history)
        history.append(f"Assistant: {reply}")
        print(f"<<< Assistant (in {t:.1f}s): {reply}")

if __name__ == "__main__":
    if not wait_for_ollama_ready(MODEL):
        exit(1)
    pull_model(MODEL)

    # Define the conversation turns here:
    turns = [
        ("user", "Hello, how are you?"),
        ("assistant", None),  # placeholder; will be filled dynamically
        ("user", "What's the weather like today?"),
        ("assistant", None),
        ("user", "Can you summarize our conversation so far?"),
        ("assistant", None),
    ]

    # We'll ignore the assistant placeholders and just use user turns
    initial = [turns[0]]  # start with the first user message
    # Perform chat:
    history = ["User: " + turns[0][1]]
    print(f">>> User: {turns[0][1]}")
    # First assistant reply
    reply, t = generate_from_history(history)
    history.append("Assistant: " + reply)
    print(f"<<< Assistant (in {t:.1f}s): {reply}")

    # Now loop through the remaining user messages
    for role, msg in turns[1:]:
        if role != "user":
            continue
        history.append("User: " + msg)
        print(f"\n>>> User: {msg}")
        reply, t = generate_from_history(history)
        history.append("Assistant: " + reply)
        print(f"<<< Assistant (in {t:.1f}s): {reply}")
