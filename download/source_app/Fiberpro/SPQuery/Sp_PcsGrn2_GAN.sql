/*;=============================================   

; Author           :  Global Software's    

; Create date      :  19/01/2023    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  26/07/2023 10.43 AM 

; =============================================  */  

CREATE PROCEDURE Sp_PcsGrn2_GAN (@Id Int,@StyleId Int,@ColId Int,@PanelId Int,@SizID Int,@RecPcs int,@Styleno Varchar(20),@Partid Int ,@PanelGrp Varchar(500),@LotNo Varchar(15),@compId int,@RewrkPcs int,@RejPcs int,@Newflg char(1)) AS   BEGIN    Declare @Semifinish Char(1),@StageId int 
SELECT @StageId = TargetStageID from Trs_PcsGrn1 Where Id = @ID  
SELECT @Semifinish = ISNull(SemiFinish,'S') From Mas_Dept A INNER JOIN Mas_JobWrkComp B ON A.DeptID = B.DeptID Where B.ID = @StageId  

If (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and LotNo=@LotNo)=0 And (@RecPcs>0 OR @RewrkPcs >0 or @RejPcs > 0)    
BEGIN    
INSERT INTO Trs_PcsGrn2(ID,StyleID,ColID,PanelID,SizID,RecPcs,StyleNo,PartID,Panelgrp,LotNo,CompID,RewrkPcs,RejPcs) VALUES(@ID,@StyleID,@ColID,@PanelID, @SizID,@RecPcs,@StyleNo,@PartID,@Panelgrp,@LotNo,@compId,@RewrkPcs,@RejPcs)    

if @Semifinish='S' 
begin Exec PROC_PiecesReceipt_Insert @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo  
End  
END     
ELSE   
BEGIN    
IF (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and @LotNo = @LotNo )>0 And (@RecPcs>0 OR @RewrkPcs >0 or @RejPcs > 0)    
BEGIN     
if @Semifinish='S'   
begin   
if @Newflg ='Y'
Exec PROC_PiecesReceipt_Insert @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo,@RewrkPcs,@RejPcs    
Else
 Exec PROC_PiecesReceipt_Update @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo ,@RewrkPcs,@RejPcs    
End  
Update Trs_PcsGrn2 set RecPcs = @RecPcs,RewrkPcs = @RewrkPcs, RejPcs = @RejPcs  Where id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo    
END    
ELSE   
BEGIN   
if @Semifinish='S'   
begin   
Exec PROC_PiecesReceipt_Delete_1 @Id ,@StyleNo ,@PartId,@ColID ,@SizId ,@RecPcs ,@LotNo    ,@RewrkPcs,@RejPcs    
end  
DELETE FROM Trs_PcsGrn2 WHERE id = @ID AND  ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo   And @RecPcs = 0  and @RejPcs =0 And @RewrkPcs =0
END   
END  
END 