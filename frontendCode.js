async function fetchAndDisplayVideos() {
    try {
      const response = await fetch('/api/gallery');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const videos = await response.json();  // Expecting JSON response from /gallery
        console.log(videos);  // Optionally log the videos to the console

        // Render videos in your gallery
        const gallery = document.querySelector('#custom-page-content');
        gallery.innerHTML = videos.map(video => `
    <div class="video-item">
        <iframe
            src="https://www.dailymotion.com/embed/video/${video.id}?autoplay=0"
            frameborder="0"
            allowfullscreen
            width="600"
            height="350">
        </iframe>
        <p>${video.title}</p>
    </div>
`).join('');
    } catch (error) {
        console.error('Error fetching or displaying videos:', error);
    }
}

// Call the function when the page loads
fetchAndDisplayVideos();
