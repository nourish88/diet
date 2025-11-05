/**
 * React Hook for Diet Form Logging
 * Provides easy-to-use logging functions for diet form actions
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  IDietLoggingService,
  DietLoggingServiceFactory,
  DietLogEntryBuilder,
  SessionIdGenerator,
  DietFormAction,
} from "@/services/DietLoggingService";

interface UseDietLoggingOptions {
  clientId?: number | null;
  dietId?: number | null;
}

export function useDietLogging(options: UseDietLoggingOptions = {}) {
  const { clientId, dietId } = options;
  const [sessionId] = useState(() => SessionIdGenerator.generate());
  const [dietitianId, setDietitianId] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const loggingServiceRef = useRef<IDietLoggingService | null>(null);
  const supabase = createClient();

  // Initialize logging service and get dietitian ID
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get auth session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.warn("No session found for diet logging");
          return;
        }

        // Get user info
        const response = await fetch("/api/auth/sync", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === "dietitian") {
            setDietitianId(data.user.id);
            // Create logging service with auth token
            loggingServiceRef.current = DietLoggingServiceFactory.create();
            setIsReady(true);
          }
        }
      } catch (error) {
        console.error("Error initializing diet logging:", error);
      }
    };

    initialize();
  }, [supabase]);

  /**
   * Log a diet form action
   */
  const logAction = async (
    action: DietFormAction,
    metadata?: {
      fieldName?: string;
      fieldValue?: any;
      previousValue?: any;
      [key: string]: any;
    }
  ) => {
    if (!isReady || !dietitianId || !loggingServiceRef.current) {
      return; // Silently skip if not ready
    }

    try {
      const builder = new DietLogEntryBuilder()
        .withSessionId(sessionId)
        .withDietitianId(dietitianId)
        .withAction(action)
        .withClientId(clientId)
        .withDietId(dietId);

      if (metadata?.fieldName) {
        builder.withField(
          metadata.fieldName,
          metadata.fieldValue,
          metadata.previousValue
        );
      }

      if (metadata) {
        const { fieldName, fieldValue, previousValue, ...rest } = metadata;
        if (Object.keys(rest).length > 0) {
          builder.withMetadata(rest);
        }
      }

      const entry = builder.build();
      await loggingServiceRef.current.log(entry);
    } catch (error) {
      // Fail silently - logging should not break the app
      console.error("Error logging diet action:", error);
    }
  };

  // Convenience methods for common actions
  const logFormOpened = () => logAction("form_opened");
  const logClientSelected = (selectedClientId: number) =>
    logAction("client_selected", {
      clientId: selectedClientId,
    });
  const logClientChanged = (oldClientId: number | null, newClientId: number) =>
    logAction("client_changed", {
      oldClientId,
      newClientId,
    });
  const logFieldChanged = (
    fieldName: string,
    newValue: any,
    oldValue?: any
  ) =>
    logAction("field_changed", {
      fieldName,
      fieldValue: newValue,
      previousValue: oldValue,
    });
  const logOgunAdded = (ogunIndex: number) =>
    logAction("ogun_added", { ogunIndex });
  const logOgunRemoved = (ogunIndex: number, ogunName?: string) =>
    logAction("ogun_removed", { ogunIndex, ogunName });
  const logOgunUpdated = (ogunIndex: number, fieldName: string, value: any) =>
    logAction("ogun_updated", { ogunIndex, fieldName, value });
  const logItemAdded = (ogunIndex: number, itemIndex: number) =>
    logAction("item_added", { ogunIndex, itemIndex });
  const logItemRemoved = (ogunIndex: number, itemIndex: number) =>
    logAction("item_removed", { ogunIndex, itemIndex });
  const logItemUpdated = (
    ogunIndex: number,
    itemIndex: number,
    fieldName: string,
    value: any
  ) =>
    logAction("item_updated", {
      ogunIndex,
      itemIndex,
      fieldName,
      value,
    });
  const logDietSaved = (savedDietId?: number) =>
    logAction("diet_saved", { dietId: savedDietId || dietId });
  const logDietSaveFailed = (error: string) =>
    logAction("diet_save_failed", { error });
  const logTemplateLoaded = (templateId: number, templateName: string) =>
    logAction("template_loaded", { templateId, templateName });
  const logDietLoaded = (loadedDietId: number) =>
    logAction("diet_loaded", { dietId: loadedDietId });
  const logPdfGenerated = () => logAction("pdf_generated");
  const logValidationError = (fieldName: string, error: string) =>
    logAction("validation_error", { fieldName, error });

  return {
    sessionId,
    dietitianId,
    isReady,
    logAction,
    logFormOpened,
    logClientSelected,
    logClientChanged,
    logFieldChanged,
    logOgunAdded,
    logOgunRemoved,
    logOgunUpdated,
    logItemAdded,
    logItemRemoved,
    logItemUpdated,
    logDietSaved,
    logDietSaveFailed,
    logTemplateLoaded,
    logDietLoaded,
    logPdfGenerated,
    logValidationError,
  };
}

