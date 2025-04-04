async function fetchAndDisplayVideos() {
    try {
      const response = await fetch('/api/gallery');
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const videos = await response.json();
      console.log(videos);

      const gallery = document.querySelector('#customGallery');
      gallery.innerHTML = videos.map(video => `
        <div class="video-item">
            <iframe
                src="https://www.youtube.com/embed/${video.id}?autoplay=0"
                frameborder="0"
                allowfullscreen
                width="100%"
                height="200">
            </iframe>
            <p>${video.title}</p>
        </div>
      `).join('');
    } catch (error) {
        console.error('Error fetching or displaying videos:', error);
    }
}

fetchAndDisplayVideos();

// /*
// * video gallery styling
// */

// #customGallery {
//     display: grid;
//     grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));  /* Automatically adjusts columns based on the screen size */
//     gap: 20px; /* Add spacing between items */
//     padding: 20px;
//   }
  
//   .video-item {
//     background: #f4f4f4;
//     border-radius: 8px;
//     padding: 10px;
//     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
//     text-align: center;
//   }
  
//   .video-item iframe {
//     border-radius: 8px;
//     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
//   }
  
//   .video-item p {
//     font-weight: bold;
//     margin-top: 10px;
//     color: #333;
//   }
  