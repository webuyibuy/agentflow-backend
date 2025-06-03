"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { encrypt, safeDecrypt } from "@/lib/encryption"
import { revalidatePath } from "next/cache"
import { getDefaultUserId } from "@/lib/default-user"

export interface ApiKeyState {
  message?: string
  error?: string
  success?: boolean
}

export interface ApiKeyWithModel {
  id: string
  provider: string
  key_name: string
  created_at: string
  preferred_model?: string
}

export async function saveApiKey(prevState: ApiKeyState | undefined, formData: FormData): Promise<ApiKeyState> {
  console.log("🔑 Starting saveApiKey action...")

  const supabase = getSupabaseFromServer()

  let userId: string
  try {
    userId = await getDefaultUserId()
    console.log("✅ Got user ID:", userId)
  } catch (error) {
    console.error("❌ Authentication error:", error)
    return { error: "Authentication required." }
  }

  const provider = formData.get("provider") as string
  const keyName = formData.get("keyName") as string
  const apiKey = formData.get("apiKey") as string
  const preferredModel = formData.get("preferredModel") as string

  console.log("📝 Form data:", { provider, keyName, preferredModel, apiKeyLength: apiKey?.length })

  if (!provider || !keyName || !apiKey) {
    return { error: "Provider, key name, and API key are required." }
  }

  // Validate API key format based on provider
  if (!validateApiKeyFormat(provider, apiKey)) {
    return { error: `Invalid API key format for ${provider}. Please check your API key.` }
  }

  try {
    // Check if a key with the same provider and name already exists
    const { data: existingKey } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("key_name", keyName)
      .single()

    if (existingKey) {
      return { error: `An API key with the name "${keyName}" already exists for ${provider}.` }
    }

    // Encrypt the API key
    console.log("🔐 Encrypting API key...")
    let encryptedKey: string
    try {
      encryptedKey = await encrypt(apiKey)
      console.log("✅ API key encrypted successfully")
    } catch (encryptError) {
      console.warn("⚠️ Encryption failed, storing as base64:", encryptError)
      // Simple fallback
      encryptedKey = btoa(apiKey)
    }

    // Save to database
    console.log("💾 Saving key to database...")
    const insertData = {
      user_id: userId,
      provider,
      key_name: keyName,
      encrypted_key: encryptedKey,
      preferred_model: preferredModel || getDefaultModel(provider),
      created_at: new Date().toISOString(),
    }

    const { data, error: insertError } = await supabase.from("api_keys").insert(insertData).select()

    if (insertError) {
      console.error("❌ Database insert error:", insertError)
      return { error: `Failed to save API key: ${insertError.message}` }
    }

    console.log("✅ API key saved successfully")
    revalidatePath("/dashboard/settings/profile")
    return {
      success: true,
      message: `🔐 API key for ${provider} saved successfully! You can now use ${preferredModel || getDefaultModel(provider)} for AI operations.`,
    }
  } catch (error) {
    console.error("❌ Unexpected error in saveApiKey:", error)
    return { error: "Failed to save API key. Please try again." }
  }
}

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
  switch (provider.toLowerCase()) {
    case "openai":
      return apiKey.startsWith("sk-") && apiKey.length > 20
    case "anthropic":
      return apiKey.startsWith("sk-ant-") && apiKey.length > 20
    case "groq":
      return apiKey.startsWith("gsk_") && apiKey.length > 20
    case "xai":
      return apiKey.startsWith("xai-") && apiKey.length > 20
    default:
      return apiKey.length > 10
  }
}

function getDefaultModel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "openai":
      return "gpt-4o-mini"
    case "anthropic":
      return "claude-3-haiku-20240307"
    case "groq":
      return "llama-3.1-8b-instant"
    case "xai":
      return "grok-beta"
    default:
      return "default"
  }
}

export async function updateApiKeyModel(prevState: ApiKeyState | undefined, formData: FormData): Promise<ApiKeyState> {
  console.log("🔄 Starting updateApiKeyModel action...")

  const supabase = getSupabaseFromServer()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    console.error("❌ Authentication error:", error)
    return { error: "Authentication required." }
  }

  const keyId = formData.get("keyId") as string
  const preferredModel = formData.get("preferredModel") as string

  if (!keyId) {
    return { error: "Key ID is required." }
  }

  try {
    const { data, error: updateError } = await supabase
      .from("api_keys")
      .update({
        preferred_model: preferredModel || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keyId)
      .eq("user_id", userId)
      .select()

    if (updateError) {
      console.error("❌ Database update error:", updateError)
      return { error: `Failed to update model preference: ${updateError.message}` }
    }

    if (!data || data.length === 0) {
      return { error: "API key not found or you don't have permission to update it." }
    }

    revalidatePath("/dashboard/settings/profile")
    return { success: true, message: `✅ Model preference updated to ${preferredModel}!` }
  } catch (error) {
    console.error("❌ Unexpected error in updateApiKeyModel:", error)
    return { error: "Failed to update model preference. Please try again." }
  }
}

export async function deleteApiKey(prevState: ApiKeyState | undefined, formData: FormData): Promise<ApiKeyState> {
  console.log("🗑️ Starting deleteApiKey action...")

  const supabase = getSupabaseFromServer()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    console.error("❌ Authentication error:", error)
    return { error: "Authentication required." }
  }

  const keyId = formData.get("keyId") as string

  if (!keyId) {
    return { error: "Key ID is required." }
  }

  try {
    const { data, error: deleteError } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", userId)
      .select()

    if (deleteError) {
      console.error("❌ Database delete error:", deleteError)
      return { error: `Failed to delete API key: ${deleteError.message}` }
    }

    if (!data || data.length === 0) {
      return { error: "API key not found or you don't have permission to delete it." }
    }

    revalidatePath("/dashboard/settings/profile")
    return { success: true, message: "🗑️ API key deleted successfully!" }
  } catch (error) {
    console.error("❌ Unexpected error in deleteApiKey:", error)
    return { error: "Failed to delete API key. Please try again." }
  }
}

export async function getApiKeys(): Promise<ApiKeyWithModel[]> {
  console.log("📋 Starting getApiKeys...")

  const supabase = getSupabaseFromServer()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    console.error("❌ Authentication error in getApiKeys:", error)
    return []
  }

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, provider, key_name, created_at, preferred_model")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching API keys:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("❌ Unexpected error in getApiKeys:", error)
    return []
  }
}

export async function getDecryptedApiKey(provider: string, userId?: string): Promise<string | null> {
  console.log("🔓 Getting decrypted API key for provider:", provider)

  const supabase = getSupabaseFromServer()
  let targetUserId = userId

  if (!targetUserId) {
    try {
      targetUserId = await getDefaultUserId()
    } catch (error) {
      console.error("❌ Authentication error in getDecryptedApiKey:", error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("encrypted_key")
      .eq("user_id", targetUserId)
      .eq("provider", provider)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.log("ℹ️ No API key found for provider:", provider)
      return null
    }

    console.log("🔓 Attempting to decrypt API key...")

    try {
      const decryptedKey = await safeDecrypt(data.encrypted_key)
      console.log("✅ API key decrypted successfully")
      return decryptedKey
    } catch (error) {
      console.error("❌ Error decrypting API key:", error)

      // Last resort: try to use the encrypted key as-is (might be plain text)
      console.log("⚠️ Using encrypted key as-is (might be plain text)")
      return data.encrypted_key
    }
  } catch (error) {
    console.error("❌ Error getting API key:", error)
    return null
  }
}

export async function getPreferredModel(provider: string, userId?: string): Promise<string | null> {
  console.log("🎯 Getting preferred model for provider:", provider)

  const supabase = getSupabaseFromServer()
  let targetUserId = userId

  if (!targetUserId) {
    try {
      targetUserId = await getDefaultUserId()
    } catch (error) {
      console.error("❌ Authentication error in getPreferredModel:", error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("preferred_model")
      .eq("user_id", targetUserId)
      .eq("provider", provider)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return getDefaultModel(provider)
    }

    return data.preferred_model || getDefaultModel(provider)
  } catch (error) {
    console.error("❌ Error getting preferred model:", error)
    return getDefaultModel(provider)
  }
}
