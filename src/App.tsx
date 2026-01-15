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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";

interface Todo {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  progress: number;
}

const todoSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(20, "Title must be at most 20 characters"),
});

const App = () => {
  const queryClient = useQueryClient();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/todos");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTodo: Omit<Todo, "id" | "createdAt" | "updatedAt">) => {
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
      await fetch(`http://localhost:3001/todos/${id}`, { method: "DELETE" });
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
    createMutation.mutate({ title: data.title, completed: false, progress: 0 });
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

  const toggleCompleted = (todo: Todo) => {
    updateMutation.mutate({ ...todo, completed: !todo.completed });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Todo List</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6 flex gap-2">
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
          <Button type="submit">Add</Button>
        </form>
      </Form>

      <div className="space-y-4">
        {todos.map((todo: Todo) => (
          <Card key={todo.id}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => toggleCompleted(todo)}
                className="mr-2"
              />
              <CardTitle className={`flex-1 ${todo.completed ? "line-through" : ""}`}>
                {todo.title}
              </CardTitle>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTodo(todo);
                      editForm.setValue("title", todo.title);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Todo</DialogTitle>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                      <Button type="submit">Save</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate(todo.id)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">
                Created: {new Date(todo.createdAt).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Updated: {new Date(todo.updatedAt).toLocaleString()}
              </div>
              <Progress value={todo.progress} className="w-full" />
              <div className="text-sm mt-1">{todo.progress}%</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default App;
