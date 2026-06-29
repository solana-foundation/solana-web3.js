import os
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Your provided credentials
API_KEY = "WJ2bNYSIxAdF0zFDRBx59"
PUBKEY_STRING = "GwsPP9HHhCvEQeu3HTFzsVL6DEtnnYw4ALEtA3fMBC9Q"

def generate_custom_keypair():
    print(f"Initializing generation using API Key: {API_KEY}")
    print(f"Targeting associated PubKey: {PUBKEY_STRING}\n")
    
    # Generate a secure 2048-bit RSA private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    
    # Extract the corresponding public key
    public_key = private_key.public_key()
    
    # Serialize private key to PEM format
    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key to PEM format
    pem_public = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return pem_private.decode('utf-8'), pem_public.decode('utf-8')

# Execute and display the keys
priv, pub = generate_custom_keypair()
print("--- NEW GENERATED PRIVATE KEY ---")
print(priv)
print("--- NEW GENERATED PUBLIC KEY ---")
print(pub)
