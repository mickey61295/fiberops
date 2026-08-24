/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/01/2023    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  M.SUGANYA 
; Last Change Date :  05/05/2025 10.30 AM 
; =============================================  */ 
CREATE PROCEDURE Sp_PcsGrn2 (@Id Int,@StyleId Int,@ColId Int,@PanelId Int,@SizID Int,@RecPcs int,@Styleno Varchar(20),@Partid Int ,@PanelGrp Varchar(500),@LotNo Varchar(15),@compId int) AS   BEGIN    Declare @Semifinish Char(1),@StageId int ,@GAN Char(1), @GrnType Varchar(50), @Dept Int , @Semifinish1 Char(1)

SELECT @GAN = IsNull(GRNAcceptance_Pcs,'N') From Options 

SELECT @GrnType = GrnType from Trs_PcsGrn1 A  Where  A.Id = @ID  

SELECT @Dept = Dept from Trs_PcsGrn1 A  Where  A.Id = @ID  

SELECT @Semifinish1 = ISNull(SemiFinish,'S') From Mas_Dept A Where A.DeptId = @Dept

SELECT @StageId = TargetStageID from Trs_PcsGrn1 Where Id = @ID  

SELECT @Semifinish = ISNull(SemiFinish,'S') From Mas_Dept A INNER JOIN Mas_JobWrkComp B ON A.DeptID = B.DeptID Where B.ID = @StageId  

If (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and LotNo=@LotNo)=0 And @RecPcs>0 

BEGIN    

if @GAN ='Y' 

INSERT INTO Trs_PcsGrn2(ID,StyleID,ColID,PanelID,SizID,RecPcs1,StyleNo,PartID,Panelgrp,LotNo,CompID,RewrkPcs,RejPcs) VALUES(@ID,@StyleID,@ColID,@PanelID, @SizID,@RecPcs,@StyleNo,@PartID,@Panelgrp,@LotNo,@compId,0,0)    

Else

INSERT INTO Trs_PcsGrn2(ID,StyleID,ColID,PanelID,SizID,RecPcs,StyleNo,PartID,Panelgrp,LotNo,CompID,RewrkPcs,RejPcs) VALUES(@ID,@StyleID,@ColID,@PanelID, @SizID,@RecPcs,@StyleNo,@PartID,@Panelgrp,@LotNo,@compId,0,0)    


If  @Semifinish1 = 'S' Or (@Semifinish1 = 'F' And @GrnType <> 'Process Return')

if @Semifinish='S' and @GAN ='N'


begin Exec PROC_PiecesReceipt_Insert @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo,0,0  

End  

END     

ELSE   

BEGIN    

IF (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and @LotNo = @LotNo )>0 And @RecPcs>0 

BEGIN     


If  @Semifinish1 = 'S' Or (@Semifinish1 = 'F' And @GrnType <> 'Process Return')

if @Semifinish='S' and @GAN ='N'  

begin   

Exec PROC_PiecesReceipt_Update @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo,0,0    

End  

if @GAN ='Y' 

Update Trs_PcsGrn2 set RecPcs1 = @RecPcs  Where id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo    

ELSE

Update Trs_PcsGrn2 set RecPcs = @RecPcs  Where id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo    



END    

ELSE   

BEGIN   


If  @Semifinish1 = 'S' Or (@Semifinish1 = 'F' And @GrnType <> 'Process Return')


if @Semifinish='S'   And @GAN ='N'

begin   


Exec PROC_PiecesReceipt_Delete_1 @Id ,@StyleNo ,@PartId,@ColID ,@SizId ,@RecPcs ,@LotNo,0,0    

end  

DELETE FROM Trs_PcsGrn2 WHERE id = @ID AND  ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo   And @RecPcs = 0  

END   

END  

END 