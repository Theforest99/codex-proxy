FROM denoland/deno:2.7.14

WORKDIR /app
COPY main.ts .
COPY deno.json .

EXPOSE 8000
CMD ["run", "--allow-net", "--allow-env", "main.ts"]
