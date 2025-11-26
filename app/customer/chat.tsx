import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { View, TextInput, Button, FlatList, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // request_id
  const user = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", table: "messages" },
        p => setMessages(prev => [...prev, p.new])
      )
      .subscribe();

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", id);

      setMessages(data || []);
    })();
  }, []);

  const send = async () => {
    if (!text) return;
    await supabase.from("messages").insert({
      request_id: id,
      sender_id: user.id,
      message: text,
    });
    setText("");
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <Text
            style={{
              margin: 5,
              textAlign: item.sender_id === user.id ? "right" : "left",
            }}
          >
            {item.message}
          </Text>
        )}
      />

      <View style={{ flexDirection: "row", padding: 10 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          style={{ flex: 1, borderWidth: 1, marginRight: 10 }}
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}
