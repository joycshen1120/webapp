//a middle station that connect front-end HTML and back-end webapp.js
//this page does: grab user input from front-end

document.getElementById("fetchMethods").addEventListener("click", () => {
  const userInput = document.getElementById("userInput").value;
  fetchMemoryMethods(userInput);
});

async function fetchMemoryMethods(topic) {
  try {
    const response = await fetch(
      `/api/memory?memory=${encodeURIComponent(topic)}`,
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    displayMemoryMethods(data);
  } catch (error) {
    console.error("Failed to fetch memory methods:", error);
  }
}

function displayMemoryMethods(methods) {
  const container = document.getElementById("memoryMethods");
  container.innerHTML = ""; // Clear previous content

  if (methods.title) {
    const title = document.createElement("h2");
    title.textContent = methods.title;
    container.appendChild(title);
  }

  Object.keys(methods).forEach((key) => {
    if (key !== "title") {
      const itemTitle = document.createElement("h3");
      itemTitle.textContent = `Method ${key}`;
      const description = document.createElement("p");
      description.textContent = methods[key];

      container.appendChild(itemTitle);
      container.appendChild(description);
    }
  });
}
