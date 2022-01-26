import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TestToken__factory } from "../typechain-types";

chai.use(solidity);
const { expect } = chai;

describe("Token", () => {
  let tokenAddress: string;

  beforeEach(async () => {
    const [deployer] = await ethers.getSigners();
    const tokenFactory = new TestToken__factory(deployer);
    const tokenContract = await tokenFactory.deploy();
    tokenAddress = tokenContract.address;

    expect(await tokenContract.totalSupply()).to.eq(ethers.utils.parseEther("100"));
  });
  describe("Mint", async () => {
    it("Should mint some tokens", async () => {
      const [deployer, user] = await ethers.getSigners();
      const tokenInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await tokenInstance.mint(user.address, toMint);
      expect(await tokenInstance.balanceOf(user.address)).to.eq(toMint);
    });
  });

  describe("Transfer", async () => {
    it("Should transfer tokens between users", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      const senderInstance = new TestToken__factory(sender).attach(tokenAddress);
      const toSend = ethers.utils.parseEther("0.4");
      await senderInstance.transfer(receiver.address, toSend);

      expect(await senderInstance.balanceOf(receiver.address)).to.eq(toSend);
    });

    it("Should fail to transfer with low balance", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      const senderInstance = new TestToken__factory(sender).attach(tokenAddress);
      const toSend = ethers.utils.parseEther("1.1");

      // Notice await is on the expect
      await expect(senderInstance.transfer(receiver.address, toSend)).to.be.revertedWith(
        "transfer amount exceeds balance",
      );
    });
  });

  describe("Distribute to mulitple addresses", async () => {
    it("Should transfer tokens between users", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("100");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      let values = new Array(100);
      let value = ethers.utils.parseEther("1");
      values.fill(value);

      const senderInstance = new TestToken__factory(sender).attach(tokenAddress);
      await senderInstance.distribute(addressesToSend, values);

      expect(await deployerInstance.balanceOf(addressesToSend[2])).to.eq(value);
    });

    it("Should fail to transfer with low balance", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("99");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      let values = new Array(100);
      let value = ethers.utils.parseEther("1");
      values.fill(value);

      const senderInstance = new TestToken__factory(sender).attach(tokenAddress);

      await expect(senderInstance.distribute(addressesToSend, values)).to.be.revertedWith(
        "transfer amount exceeds balance",
      );
    });
  });
});

const addressesToSend = [
  "0x993f4ef89438e080e9bf5d7cfb4d41ad40331366",
  "0x02e478bc0032bee7f86a07f7a7864362e7410987",
  "0xfe7d8886e5bd7edcbc34dc5a005f11ac8e0b43ee",
  "0x706efa04df3feee0ccdff36f3aa832eb99b1fdc1",
  "0x30f5e3e067f7525fd726604944f938157b36ec19",
  "0xe19ea051b30763d6809bc8fd364f14d24e82f39e",
  "0x6e7b78f78620bee25be06f5ffd6efed46b13d71e",
  "0x843638b36017c0b835df6f6577e32fb6be4ff81f",
  "0xe8df3f0f606dc287fb58133b2b38eb6e6c9191e2",
  "0x8afe759f14686a2e614101911bf31c602f3b0537",
  "0xf58d0094e3dce4a97dddff9b4955cf4556053f02",
  "0x2e65dc50886cae4ba33a618c7e1deaedd3f9d608",
  "0x81c47ede28b02b0f34b5c112efb7fc3887c44ff0",
  "0x5e15b54d05b5f60eee2850a888f46a3c6746a7c0",
  "0x27da8bd61bc8b2c0bdb21e67d3559cca489443c5",
  "0x67518e071f9282c87d586f7803d176b657afd00d",
  "0x9fea0ec1e48ca94fe5f4e9885cab3ccaff82931e",
  "0x55a34a0b70b62daf6695e04f953bd91f77b9a3b9",
  "0x3089ae209349c8f5dfe6fa7a613e75c95a2b4085",
  "0x0e4466114ac5224993c31920de7125f47b4d065d",
  "0x8c14d93de936a84c5cf022596927679303d9339a",
  "0xd0311e117f9204d1b7d2433665fd08b747e4b231",
  "0x564c63a3f7063a0dd92b8ca00a370b6a5a6cf3ea",
  "0x2eb9adfbce385fca75ce4fac29516cf215a22242",
  "0x86712fb868826a8333cddeeb50de6911807e9797",
  "0x6ff26c51280ddc3239e8bc9bdec778497314f085",
  "0xe82a4cdf4a9d78341b395b94d1274089556efc77",
  "0x791479ad2ddc6f989394e4b277a14652fb144542",
  "0x7935bc1468450cbd4945c791e4631b4f055460f6",
  "0xcd90ab0f017c8279e8525ccddf3cb1da65ec974b",
  "0x2be7b5f470374adf68af311f1b776d23c8653665",
  "0xc6c65efe186ccdd684aa5e14a2363eb1c7aa281a",
  "0x316de429ce03abec4e2ab6e1d95aa93fd136687a",
  "0x97dea04f212ea21ab43b117e15ff532d1958173f",
  "0x90cf451bba9b3d6f442acd3a33333461007ffb5a",
  "0x0a2fdf833c4ef040b2fd80ea658357c518fda37c",
  "0xca90d941554550c68ffabc3de58c91ea7ffba2f9",
  "0x7aa071871fb0b5324748b374dd79b4311d154a84",
  "0x21e50e827b53a1c34376f994b3c4d2d217ec4ded",
  "0xc83608aff9d2bae471d61b522082c89974a135aa",
  "0x93c5d6f9f8ac952eaec7f55bd4e9fb5402274c2e",
  "0x1deaf6da0e82aa0b3db929cf5d924b90e838933e",
  "0xb4a15a6f5c6c4f7e9fc4833b3472a572c742622e",
  "0xe54b8a1b24e29c29037bef69465228971be10e32",
  "0x3ae6bae91222f514efae3e001a7a766820d845e3",
  "0x4bd8af3ec2ef9b9b8108fd05dd7600416959fa09",
  "0x418937e890a4294570e88b54491a63085231f909",
  "0x1d3e755c8a239520c909953d44369cc64f597450",
  "0x64bec0495ff5c853d9a00f84bd861876f556a96a",
  "0xeed26ad928464d89f454d969fa1f9b642d98c9ba",
  "0xaa1a15ed7b8b7909bff99d2593a51f723c750c0e",
  "0x1c0b5c306c7ef7f0a40f1aaa17e96f9afb7f718a",
  "0x714b78a71b1b447f199ad4c57555087851333f6d",
  "0x37812f1bc02bb8c4d86533cb3556a99fca0c7854",
  "0x11cb56aa4a53d04e9b3409caa784df9cab9831a2",
  "0x1c463bc012d6292f749e8a5d4ecd269705641b9f",
  "0xc4b8deb1e6651af38924c40c60ab043017617a19",
  "0xff92e6c4e6faec8c8f7a5f2d42b240a469830e80",
  "0xb7db08cb0eaad2b59f7348b971ec23f4bffb0c62",
  "0x908137a235f35e63b7e0a3f9057a7e1b119e961b",
  "0x5bb8a6f31d488d46f0e2a77544c57cc2285a6e50",
  "0xfb3401bd35405f011b25d2cf9eefd825e71f397b",
  "0xd2bda14a0586a96b6188e63d142d900730f9a758",
  "0xb39a3a128e4ed1f59ea99e795f70bcdd947bb0d0",
  "0x502bf16b329b9acd402929e8938ae698cdd21de9",
  "0xaf7e4b006c334363cd6526e8ed17d6c7b5eea656",
  "0xfd5ee4af32b25ed90416b90fd786f876f9a18673",
  "0x853006a89f20441ddfe1120aa82c451cedf3109f",
  "0xbc369d8864cb215ee65226b8b0ed2e197e69e7c1",
  "0x9b791dc7083b2e3898380b12ef80b0342287a7b2",
  "0x55abfdf795874495eba447cb61b1552ccc4e4f20",
  "0x78e104403b9a067923ae1dcde5fb0882ec640780",
  "0x5a90b51c7920ca9269fbc97c37d6ecf6582846c5",
  "0x75316d7355f59fe27c92db6d8933041f9ba74927",
  "0xb518d1463e7b68ec1404e47e4a724d3605b2405a",
  "0xe99e71022e045d51191a14f670004c63c7cb619f",
  "0x462b1c02a5fdccafc6937fef61d0328e72cf9a1b",
  "0x0157f192555edcfcb817106c1d069143485d5518",
  "0x0b079a712bf61a201c5d7359dd78303d109ea6ad",
  "0xc850f13261877e365a04d11532c967460cc228a5",
  "0xbbcd735f9fcb6f0e31dd2637aa192ca72560e033",
  "0x27b44eb266c6a555d39b94d2fd79fe18bec2b315",
  "0x98002cd193cb049cae02be32dc3b7f180345f845",
  "0x66802b186705f862de60f102101b8bbd9629ffdb",
  "0x12ad61110d4f4a5611c7607d44ba33fb28cd0f57",
  "0x75e3cea89bf497d1d10df5696be2d8e40bde64e4",
  "0x154db95feec95cc9c7745ff400ee9d5ee50a08bd",
  "0x29821a4ca30f4396f99f2e4ee634750c16b62532",
  "0xb33ceb95c6416eabb0a617a8944d2ac84c90e536",
  "0x4e75812fdd8ec07a38f22565226e8f86b7f8a06f",
  "0x04ab7c98a54bd039e07062f256581f42e44be9b5",
  "0x8a8b6f66443f79e9a066c77690f025fcc01bf6a1",
  "0xbb2cadc77b69786cca2afa19ef93de91dd111b08",
  "0xd06248d29b8582953e3a47acc92ebd90dccde9ba",
  "0x26df140ab3f847146bad79a3a8c8d9413d7acefb",
  "0x3eec49d4ce849449b47b0b25ecd9bdf9ace12886",
  "0xa40b28a6ebb9baa7c1f441c08e53087e5b80408e",
  "0x643f8105ff2b85b8617a3016ad4064691e472f65",
  "0xad7a11b74b8d861c5132931e14daf3b512562264",
  "0x6b2adb04bbe1643041422eac5bf097b950e51d27",
];
