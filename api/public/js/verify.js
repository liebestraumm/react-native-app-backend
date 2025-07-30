const messageTag = document.getElementById("message");

window.addEventListener("DOMContentLoaded", async () => {
  // Getting params from verification link
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => {
      return searchParams.get(prop);
    },
  });
  const token = params.token;
  const id = params.id;
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token, id }),
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  });

  if (!response.ok) {
    messageTag.classList.add("error");
  }
  const { message } = await response.json();
  messageTag.innerText = message;
});
