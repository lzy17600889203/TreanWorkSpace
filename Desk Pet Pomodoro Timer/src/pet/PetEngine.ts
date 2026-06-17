import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  Container as PixiContainer
} from 'pixi.js'

export type PetState = 'sleep' | 'knock' | 'rest'

interface CatParts {
  root: Container
  body: Container
  head: Container
  eyes: Graphics
  closedEyes: Graphics
  mouth: Graphics
  tail: Graphics
  hammer: Container
  zBubbles: Container[]
  shades: Container
  beachChair?: Container
  juice?: Container
}

export class PetEngine {
  private app: Application
  private container: Container
  private cat!: CatParts
  private state: PetState = 'sleep'
  private tickCount = 0
  private knockCount = 0
  private shakeOffset = { x: 0, y: 0 }
  private knockTimer = 0

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.app = new Application()
    this.container = new Container()
    this.init(canvas, width, height).catch((err) => console.error(err))
  }

  private async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) {
    await this.app.init({
      canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    this.app.stage.addChild(this.container)
    this.buildCat(width, height)
    this.app.ticker.add((ticker) => this.update(ticker.deltaTime))
  }

  private buildCat(width: number, height: number) {
    const cat = new Container()
    const body = new Container()
    const head = new Container()
    const eyes = new Graphics()
    const closedEyes = new Graphics()
    const mouth = new Graphics()
    const tail = new Graphics()
    const hammer = new Container()
    const shades = new Container()
    const zBubbles: Container[] = []

    const baseX = width / 2
    const baseY = height - 80

    // Tail (behind everything)
    tail.moveTo(0, 0)
      .quadraticCurveTo(-60, -40, -40, -110)
      .stroke({ width: 28, color: 0xfca347, alignment: 0.5 })
    tail.moveTo(0, 0)
      .quadraticCurveTo(-60, -40, -40, -110)
      .stroke({ width: 22, color: 0xf39c12, alignment: 0.5 })
    tail.x = baseX + 40
    tail.y = baseY - 10
    cat.addChild(tail)

    // Body (pillow-like blob)
    const bodyShape = new Graphics()
    bodyShape.ellipse(0, 0, 110, 60).fill({ color: 0xfca347 })
    bodyShape.ellipse(0, -5, 105, 55).fill({ color: 0xf39c12 })
    bodyShape.ellipse(0, 15, 65, 35).fill({ color: 0xfff3d6 })
    body.addChild(bodyShape)

    // paws
    const pawL = new Graphics()
    pawL.ellipse(-70, 40, 25, 18).fill({ color: 0xfca347 })
    const pawR = new Graphics()
    pawR.ellipse(70, 40, 25, 18).fill({ color: 0xfca347 })
    body.addChild(pawL, pawR)

    body.x = baseX
    body.y = baseY
    cat.addChild(body)

    // Head
    const headShape = new Graphics()
    headShape.ellipse(0, 0, 75, 68).fill({ color: 0xfca347 })
    headShape.ellipse(0, -3, 72, 64).fill({ color: 0xf39c12 })
    head.addChild(headShape)

    // Ears
    const earL = new Graphics()
    earL.moveTo(-55, -50)
      .lineTo(-25, -100)
      .lineTo(-5, -55)
      .closePath()
      .fill({ color: 0xf39c12 })
    const earInL = new Graphics()
    earInL.moveTo(-45, -60)
      .lineTo(-30, -90)
      .lineTo(-15, -60)
      .closePath()
      .fill({ color: 0xff7979 })

    const earR = new Graphics()
    earR.moveTo(55, -50)
      .lineTo(25, -100)
      .lineTo(5, -55)
      .closePath()
      .fill({ color: 0xf39c12 })
    const earInR = new Graphics()
    earInR.moveTo(45, -60)
      .lineTo(30, -90)
      .lineTo(15, -60)
      .closePath()
      .fill({ color: 0xff7979 })

    head.addChild(earL, earR, earInL, earInR)

    // Stripes
    const stripe1 = new Graphics()
    stripe1.moveTo(-40, -20)
      .lineTo(-30, -5)
      .lineTo(-50, 0)
      .lineTo(-45, -25)
      .closePath()
      .fill({ color: 0xe67e22 })
    const stripe2 = new Graphics()
    stripe2.moveTo(40, -20)
      .lineTo(30, -5)
      .lineTo(50, 0)
      .lineTo(45, -25)
      .closePath()
      .fill({ color: 0xe67e22 })
    head.addChild(stripe1, stripe2)

    // Eyes (open)
    eyes.circle(-25, -5, 11).fill({ color: 0x2d3436 })
    eyes.circle(25, -5, 11).fill({ color: 0x2d3436 })
    eyes.circle(-22, -8, 4).fill({ color: 0xffffff })
    eyes.circle(28, -8, 4).fill({ color: 0xffffff })

    // Closed eyes (for sleep)
    closedEyes.moveTo(-38, -5)
      .quadraticCurveTo(-25, 5, -12, -5)
      .moveTo(38, -5)
      .quadraticCurveTo(25, 5, 12, -5)
      .stroke({ width: 4, color: 0x2d3436, alignment: 0.5, cap: 'round' })
    closedEyes.visible = false

    // Nose + mouth
    const nose = new Graphics()
    nose.moveTo(-6, 15)
      .lineTo(6, 15)
      .lineTo(0, 25)
      .closePath()
      .fill({ color: 0xff7979 })

    mouth.moveTo(0, 25)
      .quadraticCurveTo(-10, 35, -18, 28)
      .moveTo(0, 25)
      .quadraticCurveTo(10, 35, 18, 28)
      .stroke({ width: 3, color: 0x2d3436, alignment: 0.5, cap: 'round' })

    // whiskers
    const whiskerL1 = new Graphics()
    whiskerL1.moveTo(-30, 20).lineTo(-75, 15)
      .stroke({ width: 2, color: 0x2d3436, alpha: 0.6 })
    const whiskerL2 = new Graphics()
    whiskerL2.moveTo(-30, 25).lineTo(-75, 28)
      .stroke({ width: 2, color: 0x2d3436, alpha: 0.6 })
    const whiskerR1 = new Graphics()
    whiskerR1.moveTo(30, 20).lineTo(75, 15)
      .stroke({ width: 2, color: 0x2d3436, alpha: 0.6 })
    const whiskerR2 = new Graphics()
    whiskerR2.moveTo(30, 25).lineTo(75, 28)
      .stroke({ width: 2, color: 0x2d3436, alpha: 0.6 })

    head.addChild(eyes, closedEyes, nose, mouth, whiskerL1, whiskerL2, whiskerR1, whiskerR2)

    head.x = baseX - 60
    head.y = baseY - 40
    cat.addChild(head)

    // Hammer (for knocking state) - starts hidden
    const hammerStick = new Graphics()
    hammerStick.rect(-4, -30, 8, 65).fill({ color: 0x8b4513 })
    const hammerHead = new Graphics()
    hammerHead.rect(-28, -55, 56, 36)
      .fill({ color: 0xd35400 })
      .stroke({ width: 2, color: 0x7e3a06 })
    const hammerFlash = new Graphics()
    hammerFlash.rect(-28, -55, 56, 36).fill({ color: 0xffffff })
    hammerFlash.alpha = 0
    hammer.addChild(hammerStick, hammerHead, hammerFlash)
    hammer.visible = false
    hammer.x = baseX + 60
    hammer.y = baseY - 40
    cat.addChild(hammer)

    // Shades (sunglasses) - hidden
    const lFrame = new Graphics()
    lFrame.roundRect(-35, -10, 30, 22, 6)
      .fill({ color: 0x1a1a1a })
      .stroke({ width: 2, color: 0x000000 })
    const lLens = new Graphics()
    lLens.roundRect(-33, -8, 26, 18, 5)
      .fill({ color: 0x2d3436 })
      .fill({ color: 0x00c2ff, alpha: 0.7 })
    const rFrame = new Graphics()
    rFrame.roundRect(5, -10, 30, 22, 6)
      .fill({ color: 0x1a1a1a })
      .stroke({ width: 2, color: 0x000000 })
    const rLens = new Graphics()
    rLens.roundRect(7, -8, 26, 18, 5)
      .fill({ color: 0x2d3436 })
      .fill({ color: 0x00c2ff, alpha: 0.7 })
    const bridge = new Graphics()
    bridge.rect(-3, -6, 8, 4).fill({ color: 0x1a1a1a })
    const shine = new Graphics()
    shine.moveTo(-20, 0).lineTo(-10, -5).lineTo(-12, -2).lineTo(-8, 2)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.9 })
    shades.addChild(lFrame, lLens, rFrame, rLens, bridge, shine)
    shades.visible = false
    shades.x = head.x
    shades.y = head.y - 5
    cat.addChild(shades)

    // Zzz bubbles
    for (let i = 0; i < 3; i++) {
      const bubble = new Container()
      const bubbleShape = new Graphics()
      bubbleShape.circle(0, 0, 18)
        .fill({ color: 0xffffff })
        .stroke({ width: 2, color: 0x6c5ce7 })
      bubble.addChild(bubbleShape)

      const zText = new Text({
        text: 'Z',
        style: new TextStyle({
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          fontWeight: 'bold',
          fill: 0x6c5ce7
        })
      })
      zText.anchor.set(0.5)
      bubble.addChild(zText)

      bubble.x = head.x + 60 + i * 30
      bubble.y = head.y - 80 - i * 30
      bubble.visible = false
      cat.addChild(bubble)
      zBubbles.push(bubble)
    }

    // Beach chair and juice (rest only)
    const chair = new Container()
    const chairBack = new Graphics()
    chairBack.moveTo(-100, -120)
      .lineTo(-80, -120)
      .lineTo(-60, 10)
      .lineTo(-80, 10)
      .closePath()
      .fill({ color: 0x27ae60 })
    const chairSeat = new Graphics()
    chairSeat.roundRect(-100, 0, 200, 20, 8).fill({ color: 0x27ae60 })
    const chairLeg1 = new Graphics()
    chairLeg1.rect(-95, 18, 6, 40).fill({ color: 0x795548 })
    const chairLeg2 = new Graphics()
    chairLeg2.rect(89, 18, 6, 40).fill({ color: 0x795548 })
    chair.addChild(chairBack, chairSeat, chairLeg1, chairLeg2)
    chair.x = baseX
    chair.y = baseY + 30
    chair.visible = false
    cat.addChild(chair)

    const juice = new Container()
    const cup = new Graphics()
    cup.roundRect(-15, -35, 30, 45, 5)
      .fill({ color: 0xffeaa7 })
      .stroke({ width: 2, color: 0xd4a017 })
    const drink = new Graphics()
    drink.roundRect(-13, -32, 26, 35, 4).fill({ color: 0xfd79a8 })
    const straw = new Graphics()
    straw.rect(-3, -55, 6, 25).fill({ color: 0xe74c3c })
    const leaf = new Graphics()
    leaf.ellipse(10, -38, 10, 6).fill({ color: 0x27ae60 })
    juice.addChild(cup, drink, straw, leaf)
    juice.x = baseX + 130
    juice.y = baseY + 10
    juice.visible = false
    cat.addChild(juice)

    // Position root
    cat.x = 0
    cat.y = 0

    this.container.addChild(cat)

    this.cat = {
      root: cat,
      body,
      head,
      eyes,
      closedEyes,
      mouth,
      tail,
      hammer,
      zBubbles,
      shades,
      beachChair: chair,
      juice
    }

    this.applyState('sleep')
  }

  setState(state: PetState) {
    if (this.state === state) return
    this.state = state
    this.applyState(state)
  }

  getState(): PetState {
    return this.state
  }

  private applyState(state: PetState) {
    if (!this.cat) return

    // Reset visibilities
    this.cat.eyes.visible = true
    this.cat.closedEyes.visible = false
    this.cat.hammer.visible = false
    this.cat.shades.visible = false
    this.cat.beachChair && (this.cat.beachChair.visible = false)
    this.cat.juice && (this.cat.juice.visible = false)
    this.cat.zBubbles.forEach((b) => (b.visible = false))

    // Reset transforms
    this.cat.body.rotation = 0
    this.cat.body.y = 0
    this.cat.head.rotation = 0
    this.cat.head.y = 0
    this.cat.head.scale.set(1)
    this.cat.body.scale.set(1)
    this.cat.shades.scale.set(1)
    this.shakeOffset = { x: 0, y: 0 }
    this.cat.root.x = 0
    this.cat.root.y = 0

    const baseX = this.app.canvas.width / 2
    const baseY = this.app.canvas.height - 80

    if (state === 'sleep') {
      // Sleeping: body flat, head resting, eyes closed
      this.cat.body.y = 20
      this.cat.head.y = baseY - 40 + 10
      this.cat.head.x = baseX - 60
      this.cat.head.rotation = -0.1
      this.cat.closedEyes.visible = true
      this.cat.eyes.visible = false
      this.cat.zBubbles.forEach((b) => (b.visible = true))
    } else if (state === 'knock') {
      // Knocking: standing up, hammer visible, alert eyes
      this.cat.body.y = -20
      this.cat.body.scale.set(0.85, 1.15)
      this.cat.head.x = baseX - 60
      this.cat.head.y = baseY - 90
      this.cat.hammer.visible = true
      this.cat.closedEyes.visible = false
      this.cat.eyes.visible = true
    } else if (state === 'rest') {
      // Resting: chill with shades, beach chair + juice
      this.cat.body.rotation = -0.3
      this.cat.body.y = -10
      this.cat.head.x = baseX - 60 + 15
      this.cat.head.y = baseY - 60
      this.cat.head.rotation = -0.35
      this.cat.shades.visible = true
      this.cat.beachChair && (this.cat.beachChair.visible = true)
      this.cat.juice && (this.cat.juice.visible = true)
    }
  }

  private update(delta: number) {
    this.tickCount += delta

    if (this.state === 'sleep') {
      // Body breathing
      const breath = Math.sin(this.tickCount * 0.1) * 0.03
      this.cat.body.scale.y = 1 + breath
      this.cat.body.scale.x = 1 - breath * 0.5

      // Zzz bubbles pulse - one per second rhythm
      for (let i = 0; i < this.cat.zBubbles.length; i++) {
        const bubble = this.cat.zBubbles[i]
        const phase = this.tickCount * 0.08 + i * 0.8
        const pulse = 0.85 + Math.sin(phase) * 0.25
        bubble.scale.set(pulse)
        bubble.alpha = 0.55 + Math.sin(phase) * 0.35
        bubble.y += Math.sin(phase) * 0.3
      }
    } else if (this.state === 'knock') {
      this.knockTimer += delta

      // Fast jump / shake cycle
      const cycle = this.knockTimer * 0.25
      const jump = Math.abs(Math.sin(cycle)) * 20

      this.cat.head.y = (this.app.canvas.height - 80) - 90 - jump
      this.cat.body.y = -20 - jump

      // Hammer swing
      const swing = Math.sin(cycle * 2) * 0.9
      this.cat.hammer.rotation = swing
      this.cat.hammer.y = this.cat.head.y + 40
      this.cat.hammer.x = this.cat.head.x + 80

      // Screen shake
      this.shakeOffset.x = (Math.random() - 0.5) * 14
      this.shakeOffset.y = (Math.random() - 0.5) * 14
      this.cat.root.x = this.shakeOffset.x
      this.cat.root.y = this.shakeOffset.y

      // Eyes dart
      this.cat.eyes.x = Math.sin(cycle * 4) * 3

      // Hammer flash on impact
      if (Math.abs(swing) > 0.7 && this.cat.hammer.children[2]) {
        const flash = this.cat.hammer.children[2] as Graphics
        flash.alpha = 0.6
        setTimeout(() => (flash.alpha = 0), 80)
      }
    } else if (this.state === 'rest') {
      // Gentle sway
      const sway = Math.sin(this.tickCount * 0.05) * 0.03
      this.cat.body.rotation = -0.3 + sway
      this.cat.head.rotation = -0.35 + sway * 0.8

      // Juice sip animation
      if (this.cat.juice) {
        const sip = Math.sin(this.tickCount * 0.1) * 3
        this.cat.juice.y = this.app.canvas.height - 80 + 10 + sip
      }

      // Shades shine
      const shine = this.cat.shades.children[5]
      if (shine) {
        shine.alpha = 0.7 + Math.sin(this.tickCount * 0.08) * 0.3
      }
    }
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height)
    if (this.cat) {
      const baseX = width / 2
      const baseY = height - 80

      this.cat.tail.x = baseX + 40
      this.cat.tail.y = baseY - 10

      this.cat.body.x = baseX
      this.cat.body.y = baseY

      if (this.state === 'sleep') {
        this.cat.head.x = baseX - 60
        this.cat.head.y = baseY - 40 + 10
        this.cat.zBubbles.forEach((b, i) => {
          b.x = this.cat.head.x + 60 + i * 30
        })
      } else if (this.state === 'knock') {
        this.cat.head.x = baseX - 60
      } else if (this.state === 'rest') {
        this.cat.head.x = baseX - 60 + 15
      }

      if (this.cat.beachChair) {
        this.cat.beachChair.x = baseX
        this.cat.beachChair.y = baseY + 30
      }
      if (this.cat.juice) {
        this.cat.juice.x = baseX + 130
        this.cat.juice.y = baseY + 10
      }
    }
  }

  destroy() {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }
}
