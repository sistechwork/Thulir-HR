import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Trash2, Send, Image as ImageIcon, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export default function Kathaipom() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostImage, setNewPostImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});

    // Fetch posts
    const { data: posts, isLoading } = useQuery({
        queryKey: ["/api/kathaipom/posts"],
        queryFn: async () => {
            const res = await fetch("/api/kathaipom/posts", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch posts");
            return res.json();
        },
        refetchInterval: 5000,
    });

    // Create post mutation
    const createPostMutation = useMutation({
        mutationFn: async (data: { content: string; image?: File }) => {
            const formData = new FormData();
            formData.append("content", data.content);
            if (data.image) {
                formData.append("image", data.image);
            }
            const res = await fetch("/api/kathaipom/posts", {
                method: "POST",
                body: formData,
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to create post");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom/posts"] });
            setNewPostContent("");
            setNewPostImage(null);
            setImagePreview("");
            toast({ title: "Post created successfully!" });
        },
        onError: (error: any) => {
            console.error("Post creation error:", error);
            toast({
                title: "Failed to create post",
                description: error.message || "Unknown error occurred",
                variant: "destructive"
            });
        },
    });

    // Delete post mutation  
    const deletePostMutation = useMutation({
        mutationFn: async (postId: number) => {
            const res = await fetch(`/api/kathaipom/posts/${postId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete post");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom/posts"] });
            toast({ title: "Post deleted successfully!" });
        },
    });

    // Like post mutation
    const likePostMutation = useMutation({
        mutationFn: async (postId: number) => {
            const res = await fetch(`/api/kathaipom/posts/${postId}/like`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to like post");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom/posts"] });
            toast({ title: data.liked ? "Post liked!" : "Like removed" });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Could not update like status",
                variant: "destructive"
            });
        }
    });

    // Add comment mutation
    const addCommentMutation = useMutation({
        mutationFn: async ({ postId, comment_text }: { postId: number; comment_text: string }) => {
            const res = await fetch(`/api/kathaipom/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment_text }),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to add comment");
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom/posts"] });
            queryClient.invalidateQueries({ queryKey: [`/api/kathaipom/posts/${variables.postId}/comments`] });
            setCommentTexts((prev) => ({ ...prev, [variables.postId]: "" }));
            toast({ title: "Comment added!" });
        },
    });

    // Delete comment mutation
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: number) => {
            const res = await fetch(`/api/kathaipom/comments/${commentId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete comment");
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom/posts"] });
            // Since we don't know the postId here easily, we invalidate all Kathaipom comment queries
            queryClient.invalidateQueries({ queryKey: ["/api/kathaipom"] });
            toast({ title: "Comment deleted!" });
        },
    });

    // Fetch comments for a post
    const usePostComments = (postId: number) => {
        return useQuery({
            queryKey: [`/api/kathaipom/posts/${postId}/comments`],
            queryFn: async () => {
                const res = await fetch(`/api/kathaipom/posts/${postId}/comments`, {
                    credentials: "include",
                });
                if (!res.ok) throw new Error("Failed to fetch comments");
                return res.json();
            },
        });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewPostImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreatePost = () => {
        console.log("handleCreatePost called");
        console.log("newPostContent:", newPostContent);
        if (!newPostContent.trim()) {
            toast({ title: "Please enter some content", variant: "destructive" });
            return;
        }
        console.log("Calling createPostMutation.mutate");
        createPostMutation.mutate({ content: newPostContent, image: newPostImage || undefined });
    };

    const getUserInitials = (name: string) => {
        if (!name || name === "Manager") return "M";
        const parts = name.split(" ");
        return parts.length > 1
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name[0].toUpperCase();
    };

    return (
        <>
            <FloatingChatbot />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header */}
                <header className="bg-card border-b border-border px-6 py-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Kathaipom</h1>
                        <p className="text-sm text-muted-foreground">Team Social Feed</p>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-hidden p-0 sm:p-6 flex flex-col items-center">
                    <div className="w-full max-w-md h-full flex flex-col gap-6">
                        {/* Create Post (Manager Only) */}
                        {(user as any)?.role === 'manager' && (
                            <Card className="shrink-0 mx-4 sm:mx-0">
                                <CardContent className="p-4 space-y-3">
                                    <Textarea
                                        placeholder="Share something with your team..."
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        rows={3}
                                        className="text-sm border-none focus-visible:ring-0 p-0 resize-none"
                                    />
                                    {imagePreview && (
                                        <div className="relative">
                                            <img src={imagePreview} alt="Preview" className="w-full rounded-lg max-h-40 object-contain bg-muted" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={() => {
                                                    setNewPostImage(null);
                                                    setImagePreview("");
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <label htmlFor="image-upload" className="cursor-pointer hover:text-primary transition-colors">
                                            <ImageIcon className="w-5 h-5" />
                                            <Input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageSelect}
                                            />
                                        </label>
                                        <Button
                                            size="sm"
                                            onClick={handleCreatePost}
                                            disabled={createPostMutation.isPending || !newPostContent.trim()}
                                            className="rounded-full px-6"
                                        >
                                            {createPostMutation.isPending ? "..." : "Post"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Posts Feed */}
                        <div className="flex-1 max-h-[850px] w-full mx-auto overflow-y-auto snap-y snap-mandatory custom-scrollbar-hide bg-black/5 sm:rounded-3xl border sm:border-border overflow-hidden shadow-2xl">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading feed...</div>
                            ) : posts && posts.length > 0 ? (
                                posts.map((post: any) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                    />
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8 text-center text-white/60 bg-black">
                                    No posts yet. <br />Check back later!
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );

    function PostCard({ post }: { post: any }) {
        const { data: comments } = usePostComments(post.id);
        const [showComments, setShowComments] = useState(false);

        return (
            <div
                className="h-full w-full snap-start snap-always relative flex flex-col bg-black overflow-hidden"
            >
                {/* Center-constrained content area */}
                <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
                    {/* Post Media / Background */}
                    <div className="flex-1 relative flex items-center justify-center bg-zinc-900/50">
                        {post.image_url ? (
                            <img
                                src={post.image_url}
                                alt="Post"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="p-8 text-center text-white/90">
                                <p className="text-lg font-medium whitespace-pre-wrap">{post.content}</p>
                            </div>
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                        {/* Header Overlay */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 ring-1 ring-white/20">
                                    <AvatarFallback className="text-xs font-bold text-black shadow-inner" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))', backdropFilter: 'blur(10px)' }}>
                                        {getUserInitials(post.author_name || "Manager")}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs font-bold text-white shadow-sm">{post.author_name || "Manager"}</p>
                                    <p className="text-[8px] uppercase tracking-tighter text-white/60 font-medium">
                                        {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            {(user as any)?.role === 'manager' && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Delete this post?")) {
                                            deletePostMutation.mutate(post.id);
                                        }
                                    }}
                                    className="h-8 w-8 text-black/60 hover:text-red-500 transition-all duration-300"
                                    style={{ background: 'transparent' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {/* Bottom Content Area */}
                        <div className="absolute bottom-16 left-4 right-16 z-10 pointer-events-none">
                            {post.image_url && (
                                <p className="text-sm leading-snug text-white/90 whitespace-pre-wrap line-clamp-3 drop-shadow-md">
                                    {post.content}
                                </p>
                            )}
                        </div>

                        {/* Right Side Actions */}
                        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-20 pointer-events-auto">
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        likePostMutation.mutate(post.id);
                                    }}
                                    className={`p-2.5 rounded-full bg-black/40 backdrop-blur-md transition-all hover:scale-110 active:scale-90 cursor-pointer ${post.user_has_liked ? "text-red-500" : "text-white"}`}
                                    title={post.user_has_liked ? "Unlike" : "Like"}
                                >
                                    <Heart className={`w-8 h-8 ${post.user_has_liked ? "fill-current" : ""}`} />
                                </button>
                                <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">{post.like_count || 0}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowComments(!showComments);
                                    }}
                                    className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:scale-110 active:scale-90 cursor-pointer"
                                    title="Comments"
                                >
                                    <MessageCircle className="w-8 h-8" />
                                </button>
                                <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">{post.comment_count || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comments Drawer (Using the same logic as KathaipomFeed) */}
                {showComments && (
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-black/70 backdrop-blur-xl border-t border-white/10 z-30 rounded-t-2xl flex flex-col animate-in slide-in-from-bottom duration-300 pointer-events-auto">
                        <div className="w-12 h-1 bg-white/30 rounded-full mx-auto my-3 shrink-0 cursor-pointer" onClick={() => setShowComments(false)} />

                        <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-black/40 sticky top-0">
                            <span className="text-sm font-bold text-white">Comments</span>
                            <button onClick={() => setShowComments(false)} className="text-xs text-white/60 hover:text-white">Close</button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                            {comments && comments.length > 0 ? (
                                comments.map((comment: any) => (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarFallback className="text-[10px] bg-white/10 text-white">
                                                {getUserInitials(comment.user_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-[11px] text-white">{comment.user_name}</p>
                                                    <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{comment.comment_text}</p>
                                                </div>
                                                {(user as any)?.role === 'manager' && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm("Delete this comment?")) {
                                                                deleteCommentMutation.mutate(comment.id);
                                                            }
                                                        }}
                                                        className="text-white/40 hover:text-red-500 p-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-white/40">
                                    <MessageCircle className="w-10 h-10 mb-2" />
                                    <p className="text-xs">No comments yet</p>
                                </div>
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="p-4 bg-black/50 border-t border-white/10 sticky bottom-0">
                            <div className="relative flex items-center gap-2">
                                <Input
                                    placeholder="Add a comment..."
                                    value={commentTexts[post.id] || ""}
                                    onChange={(e) =>
                                        setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                                    }
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter" && commentTexts[post.id]?.trim()) {
                                            addCommentMutation.mutate({
                                                postId: post.id,
                                                comment_text: commentTexts[post.id],
                                            });
                                        }
                                    }}
                                    className="pr-12 rounded-full bg-white/10 backdrop-blur-md border-white/20 h-11 text-sm text-white placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/30"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        if (commentTexts[post.id]?.trim()) {
                                            addCommentMutation.mutate({
                                                postId: post.id,
                                                comment_text: commentTexts[post.id],
                                            });
                                        }
                                    }}
                                    disabled={!commentTexts[post.id]?.trim()}
                                    className="absolute right-1 text-white hover:text-white/80 hover:bg-transparent"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
