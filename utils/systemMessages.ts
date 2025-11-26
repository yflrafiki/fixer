// utils/systemMessages.ts
import { supabase } from "./supabase";

export const sendSystemMessage = async (requestId: string, message: string) => {
  try {
    console.log('Sending system message:', { requestId, message });
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        request_id: requestId,
        sender_id: null, // System messages have no sender
        message: message,
        is_system_message: true,
      })
      .select();

    if (error) {
      console.error('Error sending system message:', error);
      throw error;
    }

    console.log('System message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send system message:', error);
    throw error;
  }
};