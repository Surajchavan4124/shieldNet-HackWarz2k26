export const getFlaggedPosts = async () => {
    const response = await fetch('http://localhost:5000/api/moderation/flagged');
    if (!response.ok) {
        throw new Error('Failed to fetch flagged posts');
    }
    return response.json();
};

export const moderatePost = async (postId, action) => {
    const response = await fetch('http://localhost:5000/api/moderation/action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId, action })
    });
    if (!response.ok) {
        throw new Error('Failed to perform moderation action');
    }
    return response.json();
};
