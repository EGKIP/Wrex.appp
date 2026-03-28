from pydantic import BaseModel


class ProFeaturePreview(BaseModel):
    title: str
    description: str
