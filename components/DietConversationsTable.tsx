"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Conversation {
  clientId: number;
  clientName: string;
  dietId: number;
  dietName: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageFromClient: boolean;
  unreadCount: number;
}

export default function DietConversationsTable() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dietitian/conversations");

      if (!response.ok) {
        throw new Error("Sohbetler alınamadı");
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Hata",
        description:
          error instanceof Error ? error.message : "Sohbetler alınamadı",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConversation = (clientId: number, dietId: number) => {
    router.push(`/clients/${clientId}/messages?dietId=${dietId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Henüz bir sohbet yok</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Danışan</TableHead>
            <TableHead>Diyet</TableHead>
            <TableHead className="max-w-md">Son Mesaj</TableHead>
            <TableHead className="text-right">Zaman</TableHead>
            <TableHead className="text-center w-20">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => (
            <TableRow
              key={`${conversation.clientId}-${conversation.dietId}`}
              className={conversation.unreadCount > 0 ? "bg-blue-50/50" : ""}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{conversation.clientName}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-500 rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{conversation.dietName}</TableCell>
              <TableCell className="max-w-md">
                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage.substring(0, 60)}...
                </p>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {format(new Date(conversation.lastMessageTime), "d MMM HH:mm", {
                  locale: tr,
                })}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleOpenConversation(
                      conversation.clientId,
                      conversation.dietId
                    )
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
