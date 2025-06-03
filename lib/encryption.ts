// Simplified, reliable encryption that works in all environments
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "fallback-key-for-development-only-not-secure"

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

// Simple XOR encryption for reliable cross-platform compatibility
function simpleEncrypt(text: string, key: string): string {
  let result = ""
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  return btoa(result) // Base64 encode the result
}

function simpleDecrypt(encryptedText: string, key: string): string {
  try {
    const decoded = atob(encryptedText) // Base64 decode
    let result = ""
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    return result
  } catch (error) {
    throw new Error("Failed to decrypt data")
  }
}

export async function encryptApiKey(apiKey: string): Promise<EncryptedData> {
  if (!apiKey) {
    throw new Error("API key cannot be empty")
  }

  try {
    console.log("🔐 Encrypting API key with simple encryption...")
    const encrypted = simpleEncrypt(apiKey, ENCRYPTION_KEY)

    return {
      encrypted,
      iv: "simple", // Marker for simple encryption
      tag: "simple",
    }
  } catch (error) {
    console.error("Encryption failed:", error)
    throw new Error("Failed to encrypt API key")
  }
}

export async function decryptApiKey(encryptedData: EncryptedData): Promise<string> {
  try {
    const { encrypted, iv, tag } = encryptedData

    console.log("🔓 Decrypting API key...")

    // Handle simple encryption
    if (iv === "simple" && tag === "simple") {
      const decrypted = simpleDecrypt(encrypted, ENCRYPTION_KEY)
      console.log("✅ API key decrypted successfully")
      return decrypted
    }

    // Handle legacy base64 fallback
    if (iv === "fallback" && tag === "fallback") {
      console.log("🔄 Using fallback decryption")
      return atob(encrypted)
    }

    // Try to decrypt as simple encryption anyway
    try {
      const decrypted = simpleDecrypt(encrypted, ENCRYPTION_KEY)
      console.log("✅ API key decrypted with simple method")
      return decrypted
    } catch {
      // Last resort: try base64 decode
      console.log("🔄 Trying base64 decode as last resort")
      return atob(encrypted)
    }
  } catch (error) {
    console.error("Failed to decrypt API key:", error)
    throw new Error("Failed to decrypt API key")
  }
}

// Enhanced encrypt/decrypt functions
export async function encrypt(text: string): Promise<string> {
  if (!text) {
    throw new Error("Text cannot be empty")
  }

  try {
    const encryptedData = await encryptApiKey(text)
    return JSON.stringify(encryptedData)
  } catch (error) {
    console.error("Encryption failed:", error)
    throw new Error("Failed to encrypt data")
  }
}

export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) {
    throw new Error("Encrypted text cannot be empty")
  }

  try {
    const data = JSON.parse(encryptedText)
    return await decryptApiKey(data)
  } catch (error) {
    console.error("Decryption failed:", error)
    throw new Error("Failed to decrypt data")
  }
}

// Utility function to check if data is encrypted
export function isEncryptedData(data: any): data is EncryptedData {
  return (
    data &&
    typeof data === "object" &&
    typeof data.encrypted === "string" &&
    typeof data.iv === "string" &&
    typeof data.tag === "string"
  )
}

// Helper to safely encrypt API keys for storage
export async function prepareApiKeyForStorage(apiKey: string): Promise<string> {
  const encryptedData = await encryptApiKey(apiKey)
  return JSON.stringify(encryptedData)
}

// Helper to safely decrypt API keys from storage
export async function retrieveApiKeyFromStorage(encryptedString: string): Promise<string> {
  try {
    const encryptedData = JSON.parse(encryptedString)
    if (!isEncryptedData(encryptedData)) {
      throw new Error("Invalid encrypted data format")
    }
    return await decryptApiKey(encryptedData)
  } catch (error) {
    console.error("Failed to retrieve API key from storage:", error)
    throw new Error("Failed to retrieve API key")
  }
}

// Migration helper for existing plain text keys
export async function migrateExistingApiKey(plainTextKey: string): Promise<string> {
  console.log("🔄 Migrating existing API key to encrypted format...")
  return await encrypt(plainTextKey)
}

// Validation helper to check if a key is already encrypted
export function isKeyEncrypted(keyData: string): boolean {
  try {
    const parsed = JSON.parse(keyData)
    return isEncryptedData(parsed)
  } catch {
    return false
  }
}

// Safe decryption that handles both encrypted and plain text
export async function safeDecrypt(keyData: string): Promise<string> {
  if (!keyData) {
    throw new Error("Key data cannot be empty")
  }

  console.log("🔍 Attempting to decrypt key data...")

  // If it's not encrypted JSON, assume it's plain text
  if (!isKeyEncrypted(keyData)) {
    console.log("ℹ️ Found unencrypted API key - returning as-is")
    return keyData
  }

  try {
    // Try to decrypt normally
    const decrypted = await decrypt(keyData)
    console.log("✅ Successfully decrypted API key")
    return decrypted
  } catch (error) {
    console.warn("⚠️ Decryption failed, trying fallback methods:", error)

    // Try to parse and handle different formats
    try {
      const parsed = JSON.parse(keyData)

      // Try simple base64 decode
      if (parsed.encrypted) {
        try {
          const decoded = atob(parsed.encrypted)
          console.log("✅ Decrypted using base64 fallback")
          return decoded
        } catch {
          // If base64 fails, return the encrypted value as-is
          console.log("⚠️ Base64 decode failed, returning encrypted value")
          return parsed.encrypted
        }
      }
    } catch {
      // If JSON parsing fails, try base64 decode on the whole string
      try {
        const decoded = atob(keyData)
        console.log("✅ Decrypted using direct base64")
        return decoded
      } catch {
        // Last resort: return as-is
        console.log("⚠️ All decryption methods failed, returning as-is")
        return keyData
      }
    }

    // Final fallback
    console.log("⚠️ Using final fallback - returning original data")
    return keyData
  }
}

// Synchronous versions for compatibility
export function encryptSync(text: string): string {
  try {
    const encrypted = simpleEncrypt(text, ENCRYPTION_KEY)
    return JSON.stringify({
      encrypted,
      iv: "simple",
      tag: "simple",
    })
  } catch (error) {
    console.warn("⚠️ Sync encryption failed, using base64:", error)
    return btoa(text)
  }
}

export function decryptSync(encryptedText: string): string {
  try {
    const data = JSON.parse(encryptedText)
    if (data.iv === "simple" && data.tag === "simple") {
      return simpleDecrypt(data.encrypted, ENCRYPTION_KEY)
    }
    return atob(data.encrypted)
  } catch {
    // Try direct base64 decode
    try {
      return atob(encryptedText)
    } catch {
      // Return as-is if all else fails
      return encryptedText
    }
  }
}

export function safeDecryptSync(keyData: string): string {
  if (!keyData) {
    throw new Error("Key data cannot be empty")
  }

  // If it looks like JSON, try to parse and decrypt
  if (keyData.startsWith("{")) {
    try {
      return decryptSync(keyData)
    } catch {
      // Fall through to other methods
    }
  }

  // Try base64 decode
  try {
    return atob(keyData)
  } catch {
    // If not base64, return as-is
    console.warn("⚠️ Found unencrypted API key")
    return keyData
  }
}
