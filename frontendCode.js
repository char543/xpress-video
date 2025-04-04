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

// footer text
const footer = document.querySelector('footer');
const span = document.createElement('span');
span.textContent = '© Bassbarn 2025';
span.classList.add('footer-text');
footer.appendChild(span);

/*
* video gallery styling
*/

// #customGallery {
//     display: flex;
//     flex-wrap: wrap;
//     justify-content: center;
//     gap: 20px;
//     max-width: 1600px;
//     margin: 0 auto;
//     padding: 20px;
//     box-sizing: border-box;
//   }
  
//   .video-item {
//     flex: 1 1 300px; /* Grow/shrink, base size 300px */
//     max-width: 400px;
//     background: transparent;
//     border-radius: 6px;
//     overflow: hidden;
//     box-shadow: none;
//     padding: 0;
//     margin: 0;
//     display: flex;
//     flex-direction: column;
//     align-items: stretch;
//     transition: all 0.2s ease-out;
//     border: 1px solid rgba(255, 255, 255, 0.1);
//   }
  
//   .video-item:hover {
//     transform: scale(1.02);
//     border-color: rgba(101, 68, 233, 1);
//     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
//   }
  
//   .video-item iframe {
//     width: 100%;
//     aspect-ratio: 16 / 9;
//     border: none;
//     display: block;
//   }
  
//   .video-item p {
//     font-weight: bold;
//     margin: 10px 0 0 0;
//     color: #fff;
//     text-align: center;
//     font-size: 1rem;
//   }
  