FROM registry.suse.com/bci/nodejs:18
WORKDIR /app
COPY package*.json ./
RUN zypper --non-interactive --quiet up && npm install
COPY . .
EXPOSE 8080
CMD ["node", "app.js"]