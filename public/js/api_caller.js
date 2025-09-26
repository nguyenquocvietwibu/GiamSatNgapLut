async function LấyMapboxToken() {
    try {
        const res = await fetch("/api/lay-mapbox-token");
        if (!res.ok) {
            throw new Error("lỗi khi gọi api: ", res.status)
        }
        else {
            const data = await res.json();
            return data.token;
        }
    } catch (error) {
        console.error("lỗi khi lấy token: ", error);
        return null;
    }
    
}