import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import PostCard from "../../components/posts/PostCard/PostCard";
import CommentSection from "../../components/comments/CommentSection";
import styles from "./PostView.module.css";

const PostView = ({ onOpenAuthModal }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/posts/${id}`);
        if (res?.success && res?.data) {
          setPost(res.data);
        }
      } catch (err) {
        setError(err.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <h3>Post not found</h3>
        <p>{error || "This post may have been removed or does not exist."}</p>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back to Feed</span>
        </Link>
      </div>
    );
  }

  const isPostAuthor = user?.anonymousUsername === post.authorProfileId?.anonymousUsername;
  const isQuestionPost = post.postType === "question";

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backNav}>
        <ArrowLeft size={18} />
        <span>Back to Discussions</span>
      </Link>

      <PostCard post={post} onAuthRequired={onOpenAuthModal} />

      <CommentSection
        postId={post._id}
        isPostAuthor={isPostAuthor}
        isQuestionPost={isQuestionPost}
        onAuthRequired={onOpenAuthModal}
      />
    </div>
  );
};

export default PostView;
