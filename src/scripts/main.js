
/**
 * Global Configuration
 */
/**
 * Global Configuration
 */
// Explicit list of available images in src/media1/ since some numbers are missing
const AVAILABLE_IMAGES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
  12, 13, 14, 15, 16, 17, 18, 19, 20, 
  22, 24, 25, 26, 27, 28, 29, 30, 31, 32
];
const USED_IMAGES_KEY = "usedImages";

function getUsedImages() {
  return JSON.parse(localStorage.getItem(USED_IMAGES_KEY)) || [];
}

function markImageAsUsed(imageName) {
  const usedImages = getUsedImages();
  if (!usedImages.includes(imageName)) {
    usedImages.push(imageName);
    localStorage.setItem(USED_IMAGES_KEY, JSON.stringify(usedImages));
  }
}

function clearMemory() {
    localStorage.removeItem(USED_IMAGES_KEY);
    alert("Memory Cleared! All photos are available again.");
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Calculates the best grid dimensions (rows x cols) for a target item count
 * while maintaining a close approximation to the provided aspect ratio (width / height).
 */
function calculateGridDimensions(totalItems, aspectRatio) {
  let bestRows = 1;
  let bestCols = totalItems;
  let minDiff = Infinity;

  // Iterate to find factors or close approximations
  for (let r = 1; r <= Math.sqrt(totalItems); r++) {
    const c = Math.ceil(totalItems / r);
    const ratio = c / r; // Grid ratio
    const diff = Math.abs(ratio - aspectRatio);

    if (diff < minDiff) {
        minDiff = diff;
        bestRows = r;
        bestCols = c;
    }
  
    // Also check the inverse (if image is tall)
    const c2 = r;
    const r2 = Math.ceil(totalItems / c2);
    const ratio2 = c2 / r2;
    const diff2 = Math.abs(ratio2 - aspectRatio);

    if (diff2 < minDiff) {
        minDiff = diff2;
        bestRows = r2;
        bestCols = c2;
    }
  }

  // Ensure we have enough cells (simple check, optimizing for aspect ratio might skip exact count)
  while(bestRows * bestCols < totalItems) {
      if (bestCols / bestRows < aspectRatio) bestCols++;
      else bestRows++;
  }

  return { rows: bestRows, cols: bestCols };
}

/**
 * Game Class
 * Handles a single instance of the game board.
 */
class Game {
  constructor(containerId, gridSize) {
    this.containerId = containerId;
    this.gridSize = gridSize;
    this.remainingNumbers = [];
    this.chosenNumbers = [];
    this.imageName = "";
    
    // Default null, will set on image load
    this.rows = 0;
    this.cols = 0;
    this.totalCells = 0;

    this.render();
    this.init();
  }

  render() {
    const wrapper = document.getElementById(this.containerId);
    wrapper.innerHTML = `
      <div class="game-instance">
         <div class="teams-wrapper text-center">
            <div class="d-inline-flex align-items-center gap-2">
                <input type="text" class="form-control team-name-input" value="Team Name" readonly>
                <button class="btn btn-sm btn-outline-primary edit-team-btn">Edit</button>
            </div>
         </div>

         <div class="image-wrapper">
            <div class="image-container">
                <img src="" alt="Main Image" class="game-image">
            </div>
            <div class="overlay-grid"></div>
         </div>

         <div class="image-name fs-4 text-warning mt-2"></div>

         <button class="btn btn-primary mt-3 spin-btn" disabled>
            Loading...
         </button>
         
          <div class="chosen-list mt-3 w-100">
             <h6>Chosen:</h6>
             <div class="chosen-numbers-display fw-bold text-break"></div>
          </div>
      </div>
    `;

    // Bind Elements
    this.elements = {
        img: wrapper.querySelector(".game-image"),
        grid: wrapper.querySelector(".overlay-grid"),
        imageName: wrapper.querySelector(".image-name"),
        spinBtn: wrapper.querySelector(".spin-btn"),
        chosenList: wrapper.querySelector(".chosen-numbers-display"),
        teamInput: wrapper.querySelector(".team-name-input"),
        editBtn: wrapper.querySelector(".edit-team-btn"),
        imageContainer: wrapper.querySelector(".image-container")
    };

    // Bind Events
    this.elements.spinBtn.onclick = () => this.chooseRandomNumber();
    this.elements.editBtn.onclick = () => this.toggleTeamEdit();
    
    // Image Load Event to trigger Grid Calc
    this.elements.img.onload = () => {
        const naturalWidth = this.elements.img.naturalWidth;
        const naturalHeight = this.elements.img.naturalHeight;
        const aspect = naturalWidth / naturalHeight;
        
        // --- Image Upscaling / Stretching Logic ---
        // Goal: Maximize size within constraints (70vh height, container width)
        // while preserving aspect ratio. 
        
        // 1. Get constraints
        // For height: 70vh. We convert to pixels.
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const maxHeightPx = vh * 0.70; 

        // For width: The container's current width (or just a large constraints if single player)
        // In 2 player mode, we are limited by the split column (approx 48vw or less).
        // Best approach: Measure the parent's available width.
        const parentWidth = this.elements.imageContainer.parentElement.parentElement.clientWidth; 
        const maxWidthPx = parentWidth; // Don't overflow parent

        // 2. Compute target dimensions
        // Try fitting to height first (since "consistent height" is preferred)
        let targetHeight = maxHeightPx;
        let targetWidth = targetHeight * aspect;

        // 3. Check width constraint
        if (targetWidth > maxWidthPx) {
            // Fails width check, so clamp to width instead
            targetWidth = maxWidthPx;
            targetHeight = targetWidth / aspect;
        }

        // 4. Apply explicit dimensions to Wrapper or Image to force "Stretch"
        // Applying to .game-image force it to take this size (upscaling if necessary)
        // because we are setting specific pixel values, overriding 'auto'.
        this.elements.img.style.width = `${targetWidth}px`;
        this.elements.img.style.height = `${targetHeight}px`;

        // Wrapper should naturally follow since it's inline-block, but we can be explicit if needed.
        // For now, setting the image size pushes the wrapper open.
        
        // --- End Upscaling Logic ---


        // Calculate Grid - Direct Mapping from User Input
        const targetCells = this.gridSize;
        const dim = calculateGridDimensions(targetCells, aspect);
        
        this.rows = dim.rows;
        this.cols = dim.cols;
        this.totalCells = this.rows * this.cols;

        this.initGrid();
        this.resetGameLogic();
    };
  }

  init() {
      this.setRandomImage();
      // Grid init happens in onload
  }

  resetGameLogic() {
      this.chosenNumbers = [];
      this.remainingNumbers = Array.from({ length: this.totalCells }, (_, i) => i + 1);
      shuffle(this.remainingNumbers);
      
      
      // Reset logic state
      // this.questionsRemaining = this.totalQuestions; // No longer needed for 1-to-1 reveal

      this.updateChosenList();
      
      this.elements.spinBtn.disabled = false;
      this.elements.spinBtn.textContent = "Show Random Number";
  }

  setRandomImage() {
    const usedImages = getUsedImages();
    // Filter from explicit list of AVAILABLE_IMAGES
    const availableImages = AVAILABLE_IMAGES.map(String).filter((img) => !usedImages.includes(img));

    if (availableImages.length === 0) {
        // Reset or warn
       // sessionStorage.removeItem(USED_IMAGES_KEY); // Optional: auto-reset
       // return this.setRandomImage(); 
    }

    // Attempt to pick one, fallback to random existing if exhausted
    let randomImage;
    if (availableImages.length > 0) {
        randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    } else {
        // Fallback: Pick random from valid list
        randomImage = AVAILABLE_IMAGES[Math.floor(Math.random() * AVAILABLE_IMAGES.length)];
    }

    this.elements.img.src = `./src/media1/${randomImage}.jpg`;
    this.imageName = `[${randomImage}]`;
    this.elements.imageName.textContent = this.imageName;
  }

  initGrid() {
      const grid = this.elements.grid;
      grid.innerHTML = "";
      
      // Apply dynamic grid styles
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
      grid.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

      const cells = Array.from({ length: this.totalCells }, (_, i) => i + 1);
      shuffle(cells);

      cells.forEach(num => {
          const cell = document.createElement("div");
          cell.className = "grid-cell";
          cell.dataset.number = num;
          cell.textContent = num;
          
          cell.onclick = () => {
             // Manual reveal override if needed, or just visual
          };

          grid.appendChild(cell);
      });
  }

  toggleTeamEdit() {
      const input = this.elements.teamInput;
      const btn = this.elements.editBtn;
      if (input.readOnly) {
        input.readOnly = false;
        input.focus();
        btn.textContent = "Save";
      } else {
        input.readOnly = true;
        btn.textContent = "Edit";
      }
  }

  updateChosenList() {
      this.elements.chosenList.textContent = this.chosenNumbers.join(", ");
  }

  getPerimeterIndices() {
      const indices = [];
      if (this.rows <= 0 || this.cols <= 0) return [];

      // Top row
      for (let c = 0; c < this.cols; c++) indices.push(c);
      // Right col
      for (let r = 1; r < this.rows - 1; r++) indices.push(r * this.cols + (this.cols - 1));
      // Bottom row
      if (this.rows > 1) {
          for (let c = this.cols - 1; c >= 0; c--) indices.push((this.rows - 1) * this.cols + c);
      }
      // Left col
      if (this.cols > 1) {
          for (let r = this.rows - 2; r > 0; r--) indices.push(r * this.cols);
      }
      return indices;
  }

  chooseRandomNumber() {
      if (this.remainingNumbers.length === 0) return;

      // Reveal exactly one square each time
      const cellsToRevealCount = 1;

      const chosenBatch = [];
      for (let i = 0; i < cellsToRevealCount; i++) {
        if (this.remainingNumbers.length === 0) break;
        
        const idx = Math.floor(Math.random() * this.remainingNumbers.length);
        const chosen = this.remainingNumbers[idx];
        this.remainingNumbers.splice(idx, 1);
        this.chosenNumbers.push(chosen);
        chosenBatch.push(chosen);
      }

      // UI Effects
      const btn = this.elements.spinBtn;
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = "Choosing...";

      // Perimeter Animation
      const gridChildren = this.elements.grid.children;
      const perimeter = this.getPerimeterIndices();
      let tick = 0;
      const intervalTime = 50; 
      const duration = 2000;
      
      const intervalId = setInterval(() => {
          // Remove from previous
          if (tick > 0) {
             const prevIdx = perimeter[(tick - 1) % perimeter.length];
             if (gridChildren[prevIdx]) gridChildren[prevIdx].classList.remove("highlight");
          }
           
          const currIdx = perimeter[tick % perimeter.length];
          if (gridChildren[currIdx]) gridChildren[currIdx].classList.add("highlight");
          
          tick++;
      }, intervalTime);

      setTimeout(() => {
          clearInterval(intervalId);
          // Clean all highlights
          Array.from(gridChildren).forEach(c => c.classList.remove("highlight"));
          
          btn.textContent = originalText;
          btn.disabled = false;

          // Reveal the chosen batch
          chosenBatch.forEach(num => {
             const targetCell = this.elements.grid.querySelector(`.grid-cell[data-number="${num}"]`);
             if (targetCell) targetCell.classList.add("revealed");
          });

          this.updateChosenList();
          
          // If finished logic could go here
          if (this.remainingNumbers.length === 0) {
             markImageAsUsed(this.imageName.replace(/\[|\]/g, ""));
          }

      }, duration);
  }

  revealAll() {
      const cells = this.elements.grid.querySelectorAll(".grid-cell");
      cells.forEach(c => c.classList.add("revealed"));
      this.chosenNumbers = Array.from({length: this.totalCells}, (_, i) => i + 1);
      this.remainingNumbers = [];
      this.updateChosenList();
  }
}


/**
 * Main Controller
 */
const startMenu = document.getElementById("startMenu");
const gameContainer = document.getElementById("gameContainer");
const gameArea = document.getElementById("gameArea");
const startGameBtn = document.getElementById("startGameBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const replaceImageBtn = document.getElementById("replaceImageBtn");
const revealAllBtn = document.getElementById("revealAllBtn");
const clearMemoryBtn = document.getElementById("clearMemoryBtn");

let games = [];

const mainContainer = document.querySelector(".main-container");

if(clearMemoryBtn) {
    clearMemoryBtn.addEventListener("click", () => clearMemory());
}

startGameBtn.addEventListener("click", () => {
    const mode = document.querySelector('input[name="playerMode"]:checked').value;
    const gridSize = parseInt(document.getElementById("gridSizeInput").value) || 30;

    startMenu.classList.add("d-none");
    gameContainer.classList.remove("d-none");
    
    // Toggle wide mode for 2 players
    if (mode === "2") {
        mainContainer.classList.add("wide-mode");
    } else {
        mainContainer.classList.remove("wide-mode");
    }

    startNewGame(mode, gridSize);
});

backToMenuBtn.addEventListener("click", () => {
    gameContainer.classList.add("d-none");
    startMenu.classList.remove("d-none");
    gameArea.innerHTML = "";
    games = [];
});

replaceImageBtn.addEventListener("click", () => {
    games.forEach(g => g.init());
});

revealAllBtn.addEventListener("click", () => {
    games.forEach(g => g.revealAll());
});

function startNewGame(mode, gridSize) {
    gameArea.innerHTML = "";
    games = [];

    if (mode === "1") {
        gameArea.classList.remove("split-screen");
        const div = document.createElement("div");
        div.id = "game-1";
        gameArea.appendChild(div);
        games.push(new Game("game-1", gridSize));
    } else {
        gameArea.classList.add("split-screen");
        
        const div1 = document.createElement("div");
        div1.id = "game-p1";
        gameArea.appendChild(div1);
        
        const div2 = document.createElement("div");
        div2.id = "game-p2";
        gameArea.appendChild(div2);

        games.push(new Game("game-p1", gridSize));
        games.push(new Game("game-p2", gridSize));
        
        // Update default names
        games[0].elements.teamInput.value = "Team 1";
        games[1].elements.teamInput.value = "Team 2";
    }
}
