import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormMessage } from "./components/ui/form";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Edit, Trash2, Mic } from "lucide-react";
import { ModeToggle } from "./components/mode-toggle";

interface Todo {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  progress: number;
}

const todoSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(20, "Title must be at most 20 characters"),
});

const App = () => {
  const queryClient = useQueryClient();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/todos");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      newTodo: Omit<Todo, "id" | "createdAt" | "updatedAt">
    ) => {
      const res = await fetch("http://localhost:3001/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTodo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedTodo: Todo) => {
      const res = await fetch(`http://localhost:3001/todos/${updatedTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedTodo,
          updatedAt: new Date().toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`http://localhost:3001/todos/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const form = useForm<z.infer<typeof todoSchema>>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: "" },
  });

  const editForm = useForm<z.infer<typeof todoSchema>>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: "" },
  });

  const onSubmit = (data: z.infer<typeof todoSchema>) => {
    createMutation.mutate({
      title: data.title,
      completed: false,
      progress: 0,
    });
    form.reset();
  };

  const onEditSubmit = (data: z.infer<typeof todoSchema>) => {
    if (editingTodo) {
      updateMutation.mutate({ ...editingTodo, title: data.title });
      setEditingTodo(null);
      setIsEditDialogOpen(false);
      editForm.reset();
    }
  };

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      form.setValue("title", transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const toggleCompleted = (todo: Todo) => {
    updateMutation.mutate({
      ...todo,
      completed: !todo.completed,
    });
  };

  if (isLoading)
    return (
      <div className="container mx-auto p-4 max-w-2xl min-w-[320px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-12 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-4 max-w-2xl min-w-[320px]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Todo List</h1>
          <ModeToggle />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex gap-2 mb-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input placeholder="Add new todo" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="outline" onClick={startVoiceInput} disabled={isListening} className="hover:scale-105 transition-transform">
              <Mic className="w-4 h-4" />
            </Button>
            <Button type="submit">Add</Button>
          </form>
        </Form>

        <div className="space-y-4">
          {todos.map((todo: Todo) => (
            <Card key={todo.id}>
              <CardHeader className="flex flex-row items-center space-y-0 gap-2">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleCompleted(todo)}
                />
                <CardTitle
                  className={`flex-1 ${
                    todo.completed ? "line-through opacity-60" : ""
                  }`}
                >
                  {todo.title}
                </CardTitle>

                <Dialog
                  open={isEditDialogOpen}
                  onOpenChange={setIsEditDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTodo(todo);
                        editForm.setValue("title", todo.title);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Todo</DialogTitle>
                    </DialogHeader>

                    <Form {...editForm}>
                      <form
                        onSubmit={editForm.handleSubmit(onEditSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={editForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <Input {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">
                          Save
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(todo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent>
                <div className="text-sm opacity-60">
                  Created: {new Date(todo.createdAt).toLocaleString()}
                </div>
                <div className="text-sm opacity-60 mb-2">
                  Updated: {new Date(todo.updatedAt).toLocaleString()}
                </div>
                <Progress value={todo.progress} />
                <div className="text-sm mt-1">{todo.progress}%</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
