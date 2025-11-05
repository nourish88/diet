/**
 * Diet Form Logging Service
 * 
 * This service follows SOLID principles:
 * - Single Responsibility: Only handles diet form logging
 * - Open/Closed: Extensible through interfaces
 * - Liskov Substitution: Interface-based design
 * - Interface Segregation: Focused interfaces
 * - Dependency Inversion: Depends on abstractions
 */

// Interfaces following Interface Segregation Principle
export interface IDietLogEntry {
  sessionId: string;
  dietitianId: number;
  clientId?: number | null;
  dietId?: number | null;
  action: DietFormAction;
  fieldName?: string | null;
  fieldValue?: string | null;
  previousValue?: string | null;
  metadata?: Record<string, any> | null;
  source?: string; // "client" for client-side logs, "server" for server-side logs
}

export interface IDietLoggingService {
  log(entry: IDietLogEntry): Promise<void>;
  isLoggingEnabled(): Promise<boolean>;
}

export interface ILoggingConfigService {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
}

// Action types following Open/Closed principle (can be extended)
export type DietFormAction =
  | "form_opened"
  | "client_selected"
  | "client_changed"
  | "field_changed"
  | "ogun_added"
  | "ogun_removed"
  | "ogun_updated"
  | "item_added"
  | "item_removed"
  | "item_updated"
  | "diet_saved"
  | "diet_save_failed"
  | "template_loaded"
  | "diet_loaded"
  | "form_closed"
  | "pdf_generated"
  | "validation_error";

/**
 * Diet Logging Service Implementation
 * Handles logging of diet form activities
 */
export class DietLoggingService implements IDietLoggingService {
  private configService: ILoggingConfigService;
  private apiEndpoint: string;

  constructor(
    configService: ILoggingConfigService,
    apiEndpoint: string = "/api/diet-logs"
  ) {
    this.configService = configService;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Logs a diet form action
   * Returns silently if logging is disabled (fail-safe)
   */
  async log(entry: IDietLogEntry): Promise<void> {
    try {
      // Check if logging is enabled
      const isEnabled = await this.isLoggingEnabled();
      if (!isEnabled) {
        return; // Silently skip if disabled
      }

      // Validate entry
      if (!entry.sessionId || !entry.dietitianId || !entry.action) {
        console.warn("Invalid log entry:", entry);
        return;
      }

      // Get auth token for API call
      const supabase = (await import("@/lib/supabase-browser")).createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("No session found for diet logging");
        return;
      }

      // Send to API
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        console.error("Failed to log diet form action:", response.statusText);
      } else {
        console.log("✅ Diet log created:", entry.action);
      }
    } catch (error) {
      // Fail silently - logging should not break the application
      console.error("Error in diet logging service:", error);
    }
  }

  /**
   * Checks if logging is enabled
   */
  async isLoggingEnabled(): Promise<boolean> {
    try {
      return await this.configService.isEnabled();
    } catch (error) {
      console.error("Error checking logging status:", error);
      return false; // Default to disabled on error
    }
  }
}

/**
 * Logging Configuration Service
 * Manages the enabled/disabled state of logging
 */
export class LoggingConfigService implements ILoggingConfigService {
  private configKey: string = "diet_form_logging_enabled";

  async isEnabled(): Promise<boolean> {
    try {
      // Get auth token
      const supabase = (await import("@/lib/supabase-browser")).createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return false;
      }

      const response = await fetch(`/api/system-config/${this.configKey}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        return false; // Default to disabled
      }
      const data = await response.json();
      return data.value === "true";
    } catch (error) {
      console.error("Error fetching logging config:", error);
      return false;
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      // Get auth token
      const supabase = (await import("@/lib/supabase-browser")).createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No session found");
      }

      const response = await fetch(`/api/system-config/${this.configKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ value: enabled ? "true" : "false" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update logging config");
      }
    } catch (error) {
      console.error("Error updating logging config:", error);
      throw error;
    }
  }
}

/**
 * Factory for creating logging service instances
 * Follows Dependency Inversion Principle
 */
export class DietLoggingServiceFactory {
  static create(
    apiEndpoint?: string,
    configService?: ILoggingConfigService
  ): IDietLoggingService {
    const config = configService || new LoggingConfigService();
    return new DietLoggingService(config, apiEndpoint);
  }
}

/**
 * Session ID Generator
 * Creates unique session IDs for tracking form sessions
 */
export class SessionIdGenerator {
  static generate(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Log Entry Builder
 * Provides fluent interface for building log entries
 * Follows Builder pattern for extensibility
 */
export class DietLogEntryBuilder {
  private entry: Partial<IDietLogEntry> = {};

  withSessionId(sessionId: string): this {
    this.entry.sessionId = sessionId;
    return this;
  }

  withDietitianId(dietitianId: number): this {
    this.entry.dietitianId = dietitianId;
    return this;
  }

  withClientId(clientId: number | null | undefined): this {
    this.entry.clientId = clientId ?? null;
    return this;
  }

  withDietId(dietId: number | null | undefined): this {
    this.entry.dietId = dietId ?? null;
    return this;
  }

  withAction(action: DietFormAction): this {
    this.entry.action = action;
    return this;
  }

  withField(fieldName: string, fieldValue: any, previousValue?: any): this {
    this.entry.fieldName = fieldName;
    this.entry.fieldValue =
      typeof fieldValue === "string"
        ? fieldValue
        : JSON.stringify(fieldValue);
    this.entry.previousValue =
      previousValue !== undefined
        ? typeof previousValue === "string"
          ? previousValue
          : JSON.stringify(previousValue)
        : null;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.entry.metadata = metadata;
    return this;
  }

  withSource(source: string): this {
    this.entry.source = source;
    return this;
  }

  build(): IDietLogEntry {
    if (!this.entry.sessionId || !this.entry.dietitianId || !this.entry.action) {
      throw new Error("Missing required fields: sessionId, dietitianId, action");
    }
    // Ensure source has a default value
    if (!this.entry.source) {
      this.entry.source = "client";
    }
    return this.entry as IDietLogEntry;
  }
}

