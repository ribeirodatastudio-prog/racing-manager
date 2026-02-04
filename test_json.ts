class Bot {
    player: { health: number } = { health: 100 };

    get hp() {
        return this.player.health;
    }
}

const b = new Bot();
console.log(JSON.stringify(b));
