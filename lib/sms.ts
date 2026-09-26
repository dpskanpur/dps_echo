import { httpRequest } from "@/lib/http";
export { calculateSmsCredits, type SmsCreditEstimate } from "@/lib/sms-calculator";

const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL || "http://173.45.76.227";
const SMS_USERNAME = process.env.SMS_USERNAME || "demo";
const SMS_PASSWORD = process.env.SMS_PASSWORD || "demo";
const SMS_ROUTE = process.env.SMS_ROUTE || "trans1";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "DPSKNP";

export interface SmsSendResult {
  success: boolean;
  smsid?: string;
  unitsConsumed?: number;
  error?: string;
  rawStatus?: string;
}

export interface SmsBalanceResult {
  success: boolean;
  balance: number;
  routeBalances: Record<string, number>;
  error?: string;
}

export interface SmsDeliveryReport {
  success: boolean;
  status: "DELIVERED" | "SENT" | "UNDELIVERED" | "FAILED";
  details?: Array<{ mobile: string; deliveryStatus: string }>;
  error?: string;
}

/**
 * Sends Transactional or Unicode SMS via HTTP Gateway
 */
export async function sendSMS({
  phone,
  message,
  templateId,
  isUnicode = false,
}: {
  phone: string;
  message: string;
  templateId?: string;
  isUnicode?: boolean;
}): Promise<SmsSendResult> {
  try {
    // Sanitize mobile number (keep 10 or 12 digits)
    const sanitizedPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    if (!sanitizedPhone || sanitizedPhone.length !== 10) {
      return { success: false, error: "Invalid 10-digit mobile number." };
    }

    const endpoint = isUnicode
      ? `${SMS_GATEWAY_URL}/sendunicode.aspx`
      : `${SMS_GATEWAY_URL}/send.aspx`;

    const params = new URLSearchParams({
      username: SMS_USERNAME,
      pass: SMS_PASSWORD,
      route: SMS_ROUTE,
      senderid: SMS_SENDER_ID,
      numbers: sanitizedPhone,
      message: message,
    });

    if (templateId) {
      params.append("templateid", templateId);
    }

    const requestUrl = `${endpoint}?${params.toString()}`;
    const response = await httpRequest(requestUrl, { timeoutMs: 10000 });
    const text = await response.text();

    // Parse status return format: Status|Units|smsid (e.g. "1|1|025617102008")
    const parts = text.split("|");
    const statusCode = parts[0]?.trim();

    if (statusCode === "1") {
      const unitsConsumed = parseInt(parts[1] || "1", 10);
      const smsid = parts[2]?.trim() || `SMS-${Date.now()}`;
      return {
        success: true,
        smsid,
        unitsConsumed,
        rawStatus: text,
      };
    }

    const ERROR_MESSAGES: Record<string, string> = {
      "2": "Invalid SMS Gateway Credentials.",
      "3": "Insufficient SMS Credit Balance.",
      "4": "SMS Provider Server Error.",
      "5": "Invalid Sender ID.",
      "6": "Invalid SMS Route.",
      "7": "Submission Error.",
      "10": "DLT Template ID Missing or Invalid.",
    };

    const errorMsg = ERROR_MESSAGES[statusCode] || `SMS Dispatch Failed (Status Code: ${statusCode})`;
    return { success: false, error: errorMsg, rawStatus: text };
  } catch (err: any) {
    console.error("sendSMS exception:", err);
    return { success: false, error: err?.message || "Network error contacting SMS Gateway." };
  }
}

/**
 * Checks live SMS Credit Balance from gateway (/balance.aspx)
 */
export async function getSMSBalance(): Promise<SmsBalanceResult> {
  try {
    const url = `${SMS_GATEWAY_URL}/balance.aspx?username=${encodeURIComponent(SMS_USERNAME)}&pass=${encodeURIComponent(SMS_PASSWORD)}`;
    const response = await httpRequest(url, { timeoutMs: 8000 });
    const text = await response.text();

    // Format: Status|Route:Balance|Route:Balance (e.g. "1|trans1:4850|promo1:0")
    const parts = text.split("|");
    if (parts[0]?.trim() === "1") {
      const routeBalances: Record<string, number> = {};
      let activeBalance = 0;

      for (let i = 1; i < parts.length; i++) {
        const [rName, rBalStr] = parts[i].split(":");
        if (rName && rBalStr) {
          const bal = parseInt(rBalStr, 10) || 0;
          routeBalances[rName.trim()] = bal;
          if (rName.trim() === SMS_ROUTE) {
            activeBalance = bal;
          }
        }
      }

      if (activeBalance === 0 && Object.keys(routeBalances).length > 0) {
        activeBalance = Object.values(routeBalances)[0];
      }

      return {
        success: true,
        balance: activeBalance,
        routeBalances,
      };
    }

    return {
      success: false,
      balance: 0,
      routeBalances: {},
      error: text.includes("2") ? "Invalid SMS Credentials" : "Failed to query SMS balance",
    };
  } catch (err: any) {
    console.error("getSMSBalance exception:", err);
    return {
      success: false,
      balance: 0,
      routeBalances: {},
      error: err?.message || "SMS Gateway offline",
    };
  }
}

/**
 * Checks handset delivery status via /status.aspx (returns DELIVRD status)
 */
export async function getSMSDeliveryStatus(msgid: string): Promise<SmsDeliveryReport> {
  try {
    const url = `${SMS_GATEWAY_URL}/status.aspx?username=${encodeURIComponent(SMS_USERNAME)}&pass=${encodeURIComponent(SMS_PASSWORD)}&msgid=${encodeURIComponent(msgid)}`;
    const response = await httpRequest(url, { timeoutMs: 8000 });
    const data = await response.json();

    if (data?.Status && Array.isArray(data?.Response)) {
      const details = data.Response.map((item: any) => ({
        mobile: item.Mobile || "",
        deliveryStatus: item.DeliveryStatus || "UNKNOWN",
      }));

      const isDelivered = details.some((d: any) => d.deliveryStatus === "DELIVRD");
      const isFailed = details.some((d: any) => ["UNDELIV", "Unknown subscriber", "Abort"].includes(d.deliveryStatus));

      return {
        success: true,
        status: isDelivered ? "DELIVERED" : isFailed ? "UNDELIVERED" : "SENT",
        details,
      };
    }

    return { success: false, status: "SENT", error: "Delivery status pending" };
  } catch (err: any) {
    return { success: false, status: "SENT", error: err?.message };
  }
}
