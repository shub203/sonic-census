import os
import torch
import torch.nn as nn
from app.config import settings

class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super(ConvBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.pool = nn.AvgPool2d(2)

    def forward(self, x):
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.pool(x)
        return x

class Cnn14(nn.Module):
    """
    PANNs CNN14 Architecture (Kong et al., 2020)
    6 Convolutional Blocks followed by global pooling and linear classification.
    """
    def __init__(self, num_classes: int = 527):
        super(Cnn14, self).__init__()
        self.conv_block1 = ConvBlock(1, 64)
        self.conv_block2 = ConvBlock(64, 128)
        self.conv_block3 = ConvBlock(128, 256)
        self.conv_block4 = ConvBlock(256, 512)
        self.conv_block5 = ConvBlock(512, 1024)
        self.conv_block6 = ConvBlock(1024, 2048)
        
        self.fc1 = nn.Linear(2048, 2048, bias=True)
        self.fc_audioset = nn.Linear(2048, num_classes, bias=True)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (batch_size, 1, time_steps, mel_bins)
        x = self.conv_block1(x)
        x = self.conv_block2(x)
        x = self.conv_block3(x)
        x = self.conv_block4(x)
        x = self.conv_block5(x)
        x = self.conv_block6(x)
        
        # Global pooling
        x = torch.mean(x, dim=2)
        (x, _) = torch.max(x, dim=2)
        
        x = torch.relu_(self.fc1(x))
        clipwise_output = self.sigmoid(self.fc_audioset(x))
        return clipwise_output

_loaded_model = None

def get_model():
    """
    Singleton getter for PANNs CNN14 model.
    Loads pretrained weights if present; otherwise initializes model in eval mode.
    """
    global _loaded_model
    if _loaded_model is not None:
        return _loaded_model

    model = Cnn14(num_classes=527)
    model.eval()

    if os.path.exists(settings.MODEL_PATH):
        try:
            checkpoint = torch.load(settings.MODEL_PATH, map_location=settings.DEVICE)
            if "model" in checkpoint:
                model.load_state_dict(checkpoint["model"], strict=False)
            else:
                model.load_state_dict(checkpoint, strict=False)
            print(f"[AI Model] Successfully loaded PANNs CNN14 weights from {settings.MODEL_PATH}")
        except Exception as e:
            print(f"[AI Model Warning] Could not load weights: {e}. Running with initialized architecture.")
    else:
        print(f"[AI Model] No weights found at {settings.MODEL_PATH}. Hybrid acoustic classifier will be active.")

    _loaded_model = model
    return _loaded_model
